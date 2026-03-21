import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (includeArchived = false, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/api/tasks', { params: { includeArchived } });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch tasks');
  }
});

export const createTask = createAsyncThunk('tasks/create', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/api/tasks', payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to create task');
  }
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    const { data } = await api.put(`/api/tasks/${id}`, payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to update task');
  }
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/api/tasks/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to delete task');
  }
});

export const archiveTask = createAsyncThunk('tasks/archive', async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.patch(`/api/tasks/${id}/archive`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to archive task');
  }
});

export const fetchTags = createAsyncThunk('tasks/fetchTags', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/api/tags');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message ?? 'Failed to fetch tags');
  }
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    tags: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearTasksError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTasks
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createTask
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => { state.error = action.payload; });

    // updateTask
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateTask.rejected, (state, action) => { state.error = action.payload; });

    // deleteTask
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTask.rejected, (state, action) => { state.error = action.payload; });

    // archiveTask
    builder
      .addCase(archiveTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(archiveTask.rejected, (state, action) => { state.error = action.payload; });

    // fetchTags
    builder
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.tags = action.payload;
      });
  },
});

export const { clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;
