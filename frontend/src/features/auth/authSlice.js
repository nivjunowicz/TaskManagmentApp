import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';

const storedToken = sessionStorage.getItem('token');
const storedUser = sessionStorage.getItem('user');

export const loginThunk = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/auth/login', credentials);
    if (!data.success) return rejectWithValue(data.message);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Login failed');
  }
});

export const registerThunk = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/auth/register', payload);
    if (!data.success) return rejectWithValue(data.message);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Registration failed');
  }
});

export const logoutThunk = createAsyncThunk('auth/logout', async (_, { getState }) => {
  try {
    const token = sessionStorage.getItem('token');
    if (token) {
      await api.post('/api/auth/logout');
    }
  } catch {
    // server error on logout is non-fatal — always clear client state
  } finally {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: storedToken ?? null,
    user: storedUser ? JSON.parse(storedUser) : null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        sessionStorage.setItem('token', action.payload.token);
        sessionStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Register
    builder
      .addCase(registerThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        sessionStorage.setItem('token', action.payload.token);
        sessionStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.token = null;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
