import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { DocumentVersionReadDTO, DocumentFilteringModel } from '../types/document';
import {
  getDocuments,
  getDocumentById,
  createDocument as apiCreateDocument,
  editDocument as apiEditDocument,
  deleteDocument as apiDeleteDocument,
} from '../api/documents';
import i18n from '../i18n';

export const fetchDocuments = createAsyncThunk<
  { items: DocumentVersionReadDTO[]; totalCount: number },
  void,
  { state: { documents: { filteringModel: DocumentFilteringModel } }; rejectValue: string }
>(
  'documents/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await getDocuments(getState().documents.filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDocuments'));
    }
  }
);

export const fetchMoreDocuments = createAsyncThunk<
  { items: DocumentVersionReadDTO[]; totalCount: number },
  void,
  {
    state: {
      documents: {
        filteringModel: DocumentFilteringModel;
        items: DocumentVersionReadDTO[];
        noMorePages: boolean;
      };
    };
    rejectValue: string;
  }
>(
  'documents/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().documents;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = { ...filteringModel, pageNumber: filteringModel.pageNumber + 1 };
      const res = await getDocuments(next);
      return {
        items: items.concat(res.data.items),
        totalCount: res.data.totalCount,
        nextPageNumber: next.pageNumber,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadMore'));
    }
  }
);

export const goToDocumentsPage = createAsyncThunk<
  { items: DocumentVersionReadDTO[]; totalCount: number; pageNumber: number },
  number,
  { state: { documents: { filteringModel: DocumentFilteringModel } }; rejectValue: string }
>(
  'documents/goToPage',
  async (pageNumber, { getState, rejectWithValue }) => {
    try {
      const { filteringModel } = getState().documents;
      const res = await getDocuments({ ...filteringModel, pageNumber: pageNumber - 1 });
      return { items: res.data.items, totalCount: res.data.totalCount, pageNumber };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDocuments'));
    }
  }
);

export const fetchDocumentById = createAsyncThunk<
  DocumentVersionReadDTO,
  { documentId: string; versionId: string },
  { rejectValue: string }
>(
  'documents/fetchById',
  async ({ documentId, versionId }, { rejectWithValue }) => {
    try {
      const res = await getDocumentById(documentId, versionId);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDocument'));
    }
  }
);

export const createDocument = createAsyncThunk<
  DocumentVersionReadDTO,
  FormData,
  { rejectValue: string }
>('documents/create', async (model, { rejectWithValue }) => {
  try {
    const res = await apiCreateDocument(model);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.createDocument'));
  }
});

export const editDocument = createAsyncThunk<
  DocumentVersionReadDTO,
  { documentId: string; versionId: string; model: FormData },
  { rejectValue: string }
>(
  'documents/edit',
  async ({ documentId, versionId, model }, { rejectWithValue }) => {
    try {
      const res = await apiEditDocument(documentId, versionId, model);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.editDocument'));
    }
  }
);

export const deleteDocument = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('documents/delete', async (versionId, { rejectWithValue }) => {
  try {
    await apiDeleteDocument(versionId);
    return versionId;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.deleteDocument'));
  }
});

type DocumentsState = {
  items: DocumentVersionReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: DocumentFilteringModel;
  totalCount: number;
  noMorePages: boolean;
  currentDocument: DocumentVersionReadDTO | null;
};

const initialState: DocumentsState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 20 },
  totalCount: 0,
  noMorePages: false,
  currentDocument: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setDocumentsFilter: (state, { payload }: { payload: Partial<DocumentFilteringModel> }) => {
      state.filteringModel = { ...state.filteringModel, ...payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchDocuments.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadDocuments');
      });
    builder
      .addCase(fetchMoreDocuments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreDocuments.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        const next = (payload as { nextPageNumber?: number }).nextPageNumber;
        if (typeof next === 'number') state.filteringModel.pageNumber = next;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
      })
      .addCase(fetchMoreDocuments.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });
    builder
      .addCase(goToDocumentsPage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(goToDocumentsPage.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = payload.pageNumber - 1;
        const totalPages = Math.ceil(payload.totalCount / state.filteringModel.pageSize);
        state.noMorePages = payload.pageNumber >= totalPages;
        state.error = null;
      })
      .addCase(goToDocumentsPage.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? null;
      });
    builder
      .addCase(fetchDocumentById.fulfilled, (state, { payload }) => {
        state.currentDocument = payload;
      })
      .addCase(fetchDocumentById.rejected, (state) => {
        state.currentDocument = null;
      })
      .addCase(createDocument.fulfilled, (state, { payload }) => {
        state.items = [payload, ...state.items];
        state.totalCount = (state.totalCount ?? 0) + 1;
      })
      .addCase(editDocument.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((d) => d.id === payload.id);
        if (i >= 0) state.items[i] = payload;
        if (state.currentDocument?.id === payload.id) state.currentDocument = payload;
      })
      .addCase(deleteDocument.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((d) => d.id !== payload);
        state.totalCount = Math.max(0, (state.totalCount ?? 1) - 1);
        if (state.currentDocument?.id === payload) state.currentDocument = null;
      });
  },
});

export const { setDocumentsFilter } = documentsSlice.actions;
export default documentsSlice.reducer;
