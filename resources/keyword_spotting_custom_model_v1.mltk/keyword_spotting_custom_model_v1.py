__mltk_version__ = '0.20.0'

import os
import numpy as np
import tensorflow as tf
import librosa
from mltk.core import (
    MltkModel,
    TrainMixin,
    DatasetMixin,
    EvaluateClassifierMixin
)
from mltk.core.preprocess.audio.audio_feature_generator import AudioFeatureGeneratorSettings
from mltk.core.preprocess.utils import audio as audio_utils
from mltk.models.shared import tenet
from mltk.utils.path import create_user_dir
from sklearn.model_selection import train_test_split

# Frontend settings for training (with quantization)
frontend_settings = AudioFeatureGeneratorSettings()
frontend_settings.sample_rate_hz = 16000
frontend_settings.sample_length_ms = 1000
frontend_settings.window_size_ms = 30
frontend_settings.window_step_ms = 10
frontend_settings.filterbank_n_channels = 104
frontend_settings.filterbank_upper_band_limit = 7500.0
frontend_settings.filterbank_lower_band_limit = 125.0
frontend_settings.noise_reduction_enable = True
frontend_settings.noise_reduction_smoothing_bits = 10
frontend_settings.noise_reduction_even_smoothing = 0.01
frontend_settings.noise_reduction_odd_smoothing = 0.03
frontend_settings.noise_reduction_min_signal_remaining = 0.50
frontend_settings.dc_notch_filter_enable = True
frontend_settings.dc_notch_filter_coefficient = 0.95
frontend_settings.quantize_dynamic_scale_enable = True
frontend_settings.quantize_dynamic_scale_range_db = 30.0

# Separate frontend settings for representative dataset (no quantization)
float_frontend_settings = AudioFeatureGeneratorSettings()
float_frontend_settings.sample_rate_hz = 16000
float_frontend_settings.sample_length_ms = 1000
float_frontend_settings.window_size_ms = 30
float_frontend_settings.window_step_ms = 10
float_frontend_settings.filterbank_n_channels = 104
float_frontend_settings.filterbank_upper_band_limit = 7500.0
float_frontend_settings.filterbank_lower_band_limit = 125.0
float_frontend_settings.noise_reduction_enable = True
float_frontend_settings.noise_reduction_smoothing_bits = 10
float_frontend_settings.noise_reduction_even_smoothing = 0.01
float_frontend_settings.noise_reduction_odd_smoothing = 0.03
float_frontend_settings.noise_reduction_min_signal_remaining = 0.50
float_frontend_settings.dc_notch_filter_enable = True
float_frontend_settings.dc_notch_filter_coefficient = 0.95
float_frontend_settings.quantize_dynamic_scale_enable = False
float_frontend_settings.quantize_dynamic_scale_range_db = 30.0

# Model definition
class MyModel(
    MltkModel,
    TrainMixin,
    DatasetMixin,
    EvaluateClassifierMixin
):
    def __init__(self):
        super().__init__()
        self.classes = ['pay', 'discount', 'combo', 'unknown']
        self._class_ids = {name: idx for idx, name in enumerate(self.classes)}

    def load_dataset(self, subset: str, test: bool = False, **kwargs):
        assert subset in ['training', 'validation', 'evaluation']
        dataset_dir = self.dataset
        sample_rate = frontend_settings.sample_rate_hz
        batch_size = self.batch_size
        expected_samples = sample_rate

        def _ensure_length(audio_data, expected_length):
            if len(audio_data) > expected_length:
                start = np.random.randint(0, len(audio_data) - expected_length)
                return audio_data[start:start + expected_length]
            elif len(audio_data) < expected_length:
                return np.pad(audio_data, (0, expected_length - len(audio_data)), mode='constant')
            return audio_data

        def _augment(audio_data, sr, class_path):
            # Normalize audio to [-1, 1]
            max_abs = np.max(np.abs(audio_data))
            if max_abs > 0:
                audio_data = audio_data / max_abs

            # Apply random gain
            gain_range = (0.8, 1.3) if 'pay' in class_path else (0.7, 1.5)
            audio_data = audio_data * np.random.uniform(*gain_range)

            # Add background noise with higher probability for _unknown_
            noise_dir = os.path.join(dataset_dir, '_background_noise_')
            noise_prob = 1.0 if 'unknown' in class_path else (0.5 if 'combo' in class_path else 0.3)
            if np.random.uniform() < noise_prob and os.path.exists(noise_dir):
                noise_subdirs = ['ambient', 'brd2601']
                noise_files = []
                for subdir in noise_subdirs:
                    subdir_path = os.path.join(noise_dir, subdir)
                    if os.path.exists(subdir_path):
                        noise_files.extend([os.path.join(subdir_path, f) for f in os.listdir(subdir_path) if f.endswith('.wav')])
                if noise_files:
                    noise_path = np.random.choice(noise_files)
                    noise_data, _ = librosa.load(noise_path, sr=sr, mono=True)
                    noise_data = _ensure_length(noise_data, expected_samples)
                    snr_db = np.random.uniform(0, 10) if 'unknown' in class_path else np.random.uniform(5, 12)
                    signal_power = np.mean(audio_data ** 2)
                    noise_power = np.mean(noise_data ** 2)
                    if noise_power > 0:
                        scale = np.sqrt(signal_power / (noise_power * 10 ** (snr_db / 10)))
                        audio_data = audio_data + scale * noise_data
                    audio_data = _ensure_length(audio_data, expected_samples)

            # Add silence augmentation for _unknown_
            if 'unknown' in class_path and np.random.uniform() < 0.5:
                audio_data = np.zeros_like(audio_data)

            # Apply impulse response
            ir_dir = os.path.join(dataset_dir, '_ir_responses_', 'Audio')
            if np.random.uniform() < 0.3 and os.path.exists(ir_dir):
                ir_files = [os.path.join(ir_dir, f) for f in os.listdir(ir_dir) if f.endswith('.wav')]
                if ir_files:
                    ir_path = np.random.choice(ir_files)
                    ir_data, _ = librosa.load(ir_path, sr=sr, mono=True)
                    ir_data = _ensure_length(ir_data, expected_samples)
                    audio_data = np.convolve(audio_data, ir_data, mode='same')
                    audio_data = _ensure_length(audio_data, expected_samples)

            # Pitch shift
            if np.random.uniform() < 0.2: 
                n_steps = np.random.uniform(-0.3, 0.3) if 'pay' in class_path or 'discount' in class_path else np.random.uniform(-1, 1)
                audio_data = librosa.effects.pitch_shift(y=audio_data, sr=sr, n_steps=n_steps)
                audio_data = _ensure_length(audio_data, expected_samples)

            # Time shift
            if np.random.uniform() < 0.3:
                shift_ms = np.random.uniform(-50, 50)
                shift_samples = int(shift_ms * sr / 1000)
                if shift_samples > 0:
                    audio_data = np.pad(audio_data, (shift_samples, 0))[:-shift_samples]
                elif shift_samples < 0:
                    audio_data = np.pad(audio_data, (0, -shift_samples))[shift_samples:]
                audio_data = _ensure_length(audio_data, expected_samples)

            # Time stretch
            if np.random.uniform() < 0.2:
                rate = np.random.uniform(0.95, 1.05) if 'pay' in class_path or 'discount' in class_path else np.random.uniform(0.9, 1.1)
                audio_data = librosa.effects.time_stretch(y=audio_data, rate=rate)
                audio_data = _ensure_length(audio_data, expected_samples)

            # Random crop (except for 'unknown')
            crop_prob = 0.3 if 'combo' in class_path else 0.2
            if np.random.uniform() < crop_prob and 'unknown' not in class_path:
                crop_ratio = np.random.uniform(0.8, 1.0) if 'pay' in class_path or 'discount' in class_path else np.random.uniform(0.7, 1.0)
                crop_samples = int(len(audio_data) * crop_ratio)
                start = np.random.randint(0, len(audio_data) - crop_samples)
                audio_data = audio_data[start:start + crop_samples]
                audio_data = _ensure_length(audio_data, expected_samples)

            return audio_data

        all_samples = []
        all_labels = []
        class_paths = [os.path.join(dataset_dir, c) for c in self.classes if os.path.exists(os.path.join(dataset_dir, c))]
        for class_path in class_paths:
            class_name = os.path.basename(class_path)
            audio_files = [os.path.join(class_path, f) for f in os.listdir(class_path) if f.endswith('.wav')]
            for audio_path in audio_files:
                audio_data, sr = librosa.load(audio_path, sr=sample_rate, mono=True)
                audio_data = _ensure_length(audio_data, expected_samples)
                if subset == 'training':
                    audio_data = _augment(audio_data, sr, class_path)
                audio_data = _ensure_length(audio_data, expected_samples)
                spectrogram = audio_utils.apply_frontend(sample=audio_data, settings=frontend_settings)
                all_samples.append(spectrogram)
                all_labels.append(self._class_ids[class_name])

        all_samples = np.array(all_samples)
        all_labels = tf.keras.utils.to_categorical(all_labels, num_classes=len(self.classes))

        # Split data
        train_samples, val_samples, train_labels, val_labels = train_test_split(
            all_samples, all_labels, test_size=0.2, random_state=42, stratify=all_labels
        )

        def create_dataset(samples, labels):
            if samples is None or labels is None:
                return None
            dataset = tf.data.Dataset.from_tensor_slices((samples, labels))
            dataset = dataset.map(lambda x, y: (tf.expand_dims(x, axis=1), y), num_parallel_calls=tf.data.AUTOTUNE)
            return dataset.batch(batch_size).prefetch(tf.data.AUTOTUNE)

        if subset == 'training':
            self._x_train = create_dataset(train_samples, train_labels)
            self._y_train = train_labels
            self.x = create_dataset(train_samples, train_labels)
            self._x_validation = create_dataset(val_samples, val_labels)
            self._y_validation = val_labels
            self.validation_data = create_dataset(val_samples, val_labels)
        elif subset == 'validation':
            self._x_validation = create_dataset(val_samples, val_labels)
            self._y_validation = val_labels
            self.validation_data = create_dataset(val_samples, val_labels)
        elif subset == 'evaluation':
            self._x_test = create_dataset(all_samples, all_labels)
            self._y_test = all_labels

my_model = MyModel()

dataset_dir = '/content/drive/MyDrive/iot_challenge/datasets/keyword_dataset'
classes = ['pay', 'discount', 'combo', 'unknown']
class_counts = {}
for cls in classes:
    cls_path = os.path.join(dataset_dir, cls)
    if os.path.exists(cls_path):
        class_counts[cls] = len([f for f in os.listdir(cls_path) if f.endswith('.wav')])

total_samples = sum(class_counts.values())
class_weights = {i: total_samples / (len(classes) * count) for i, (cls, count) in enumerate(class_counts.items())}
class_weights[0] = class_weights[0] * 1.0 
class_weights[1] = class_weights[1] * 1.0 
class_weights[2] = class_weights[2] * 1.0 
class_weights[3] = class_weights[3] * 1.0  

my_model.class_weights = class_weights

my_model.version = 1
my_model.description = 'Keyword classifier model between pay, discount, combo and unknown'
my_model.dataset = '/content/drive/MyDrive/iot_challenge/datasets/keyword_dataset'

my_model.batch_size = 32
my_model.epochs = 200
my_model.checkpoint['monitor'] = 'val_accuracy'
my_model.checkpoint['filepath'] = 'best_weights_epoch{epoch:02d}.weights.h5'
my_model.checkpoint['save_best_only'] = True
my_model.checkpoint['save_weights_only'] = True
my_model.checkpoint['mode'] = 'max'
my_model.checkpoint['save_freq'] = 'epoch'

my_model.train_callbacks = [
    tf.keras.callbacks.TerminateOnNaN(),
    tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=40, restore_best_weights=True),
    tf.keras.callbacks.LearningRateScheduler(
        lambda epoch: [
            (10,  0.001),
            (20,  0.002),
            (30,  0.003),
            (40,  0.004),
            (50,  0.005),
            (60,  0.002),
            (70,  0.001),
            (80,  0.0005),
            (90,  0.0002),
            (100, 1e-4),
            (150, 5e-5),
        ][min(epoch // 10, 10)][1]
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss', factor=0.5, patience=10, min_lr=1e-6
    )
]

my_model.tflite_converter['supported_ops'] = [tf.lite.OpsSet.TFLITE_BUILTINS]
my_model.tflite_converter['optimizations'] = [tf.lite.Optimize.DEFAULT]
my_model.tflite_converter['inference_input_type'] = np.int8
my_model.tflite_converter['inference_output_type'] = np.int8

def representative_dataset_gen():
    dataset_dir = '/content/drive/MyDrive/iot_challenge/datasets/keyword_dataset'
    classes = ['pay', 'discount', 'combo', 'unknown']
    for cls in classes:
        cls_path = os.path.join(dataset_dir, cls)
        audio_files = [os.path.join(cls_path, f) for f in os.listdir(cls_path) if f.endswith('.wav')]
        for audio_path in audio_files[:50]:
            audio, sr = librosa.load(audio_path, sr=16000, mono=True)
            if len(audio) > 16000:
                audio = audio[:16000]
            elif len(audio) < 16000:
                audio = np.pad(audio, (0, 16000 - len(audio)), mode='constant')
            spectrogram = audio_utils.apply_frontend(sample=audio, settings=float_frontend_settings)
            spectrogram = np.expand_dims(spectrogram, axis=0)
            spectrogram = np.expand_dims(spectrogram, axis=2).astype(np.float32)
            yield [spectrogram]

my_model.tflite_converter['representative_dataset'] = representative_dataset_gen

# Save frontend settings and model parameters into model
my_model.model_parameters.update(frontend_settings)
my_model.model_parameters.update({
    'average_window_duration_ms': 1000,
    'detection_threshold': 200,
    'suppression_ms': 1000,
    'minimum_count': 2,
    'volume_gain': 2.0,
    'latency_ms': 1,
    'verbose_model_output_logs': True
})

def my_model_builder(model: MyModel) -> tf.keras.Model:
    frame_count = 1 + (frontend_settings.sample_length_ms - frontend_settings.window_size_ms) // frontend_settings.window_step_ms
    input_shape = (frame_count, 1, frontend_settings.filterbank_n_channels)
    keras_model = tenet.TENet12(
        input_shape=input_shape,
        classes=len(model.classes),
        channels=64,
        blocks=3, 
        kernel_regularizer=tf.keras.regularizers.l2(0.02)
    )
    keras_model.compile(
        loss='categorical_crossentropy',
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001, epsilon=1e-8),
        metrics=['accuracy']
    )
    return keras_model

my_model.build_model_function = my_model_builder
my_model.keras_custom_objects['MultiScaleTemporalConvolution'] = tenet.MultiScaleTemporalConvolution
