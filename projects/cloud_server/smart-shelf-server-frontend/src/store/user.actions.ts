// ...new file...
import { Dispatch } from "redux";

/**
 * Thunk action: logout
 * - xóa token/session từ localStorage (nếu bạn dùng)
 * - dispatch action USER_LOGOUT để reducer clear user state
 */
export const logout = () => {
  return (dispatch: Dispatch) => {
    try {
      // remove auth token or other session info
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // dispatch logout action
      dispatch({ type: "USER_LOGOUT" });
    } catch (e) {
      // ignore
      console.error("logout error", e);
    }
  };
};

export default logout;