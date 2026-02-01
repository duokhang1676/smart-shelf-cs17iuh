import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/', // <== Quan trọng, để đúng nếu bạn dùng domain ở root
  plugins: [react()],
  build: {
    // đảm bảo external luôn là mảng / function hợp lệ — tránh lỗi khi môi trường làm thay đổi config
    rollupOptions: {
      external: [],
    },
    // tăng giới hạn cảnh báo nếu bạn có bundle lớn
    chunkSizeWarningLimit: 2000,
  },
});
