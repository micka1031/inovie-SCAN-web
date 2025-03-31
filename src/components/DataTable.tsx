import React, { useState } from 'react';
import { 
  DataGrid, 
  GridColDef, 
  GridToolbar, 
  GridFilterModel, 
  GridSortModel,
  GridValueFormatter,
  GridRenderCellParams,
  GridRowSelectionModel,
  GridRowModel,
  GridRowId
} from '@mui/x-data-grid';
import { Box, Paper, Typography } from '@mui/material';
import './DataTable.css';

interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  title?: string;
  loading?: boolean;
  pageSize?: number;
  checkboxSelection?: boolean;
  onSelectionChange?: (selectedIds: GridRowSelectionModel) => void;
  selectionModel?: GridRowId[];
  editMode?: boolean;
  height?: string | number;
  filterModel?: GridFilterModel;
  onFilterModelChange?: (model: GridFilterModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  onCellEditCommit?: (params: any) => void;
  getRowClassName?: (params: any) => string;
}

const DataTable = <T extends { id: string }>({
  rows,
  columns,
  title,
  loading = false,
  pageSize = 10,
  checkboxSelection = false,
  onSelectionChange,
  selectionModel = [],
  editMode = false,
  height = '70vh',
  filterModel,
  onFilterModelChange,
  sortModel,
  onSortModelChange,
  onCellEditCommit,
  getRowClassName
}: DataTableProps<T>) => {
  const [paginationModel, setPaginationModel] = useState({
    pageSize: pageSize,
    page: 0,
  });

  const handleSelectionChange = (newSelectionModel: GridRowSelectionModel) => {
    if (onSelectionChange) {
      onSelectionChange(newSelectionModel);
    }
  };

  // Ajouter des classes pour le mode édition
  const enhancedColumns = editMode
    ? columns.map(column => ({
        ...column,
        editable: column.editable !== false, // Par défaut, toutes les colonnes sont éditables
        disableReorder: false, // Permettre le réarrangement de toutes les colonnes
      }))
    : columns.map(column => ({
        ...column,
        disableReorder: false, // Permettre le réarrangement même en mode non-édition
      }));

  // Gérer la mise à jour des lignes après édition
  const processRowUpdate = (newRow: GridRowModel) => {
    if (onCellEditCommit) {
      const oldRow = rows.find(row => (row as any).id === newRow.id);
      if (oldRow) {
        const changedField = Object.keys(newRow).find(key => 
          (oldRow as any)[key] !== (newRow as any)[key]
        ) || '';
        
        if (changedField) {
          onCellEditCommit({
            id: newRow.id,
            field: changedField,
            value: (newRow as any)[changedField]
          });
        }
      }
    }
    return newRow;
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      {title && (
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ height, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={enhancedColumns}
          loading={loading}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 20, 50, 100]}
          checkboxSelection={checkboxSelection}
          onRowSelectionModelChange={handleSelectionChange}
          rowSelectionModel={selectionModel as GridRowSelectionModel}
          filterModel={filterModel}
          onFilterModelChange={onFilterModelChange}
          sortModel={sortModel}
          onSortModelChange={onSortModelChange}
          disableRowSelectionOnClick={!checkboxSelection}
          getRowClassName={getRowClassName}
          editMode="cell"
          processRowUpdate={processRowUpdate}
          slots={{
            toolbar: GridToolbar,
          }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
              csvOptions: { 
                fileName: title ? title.toLowerCase().replace(/\s+/g, '-') : 'data-export',
                delimiter: ';' 
              },
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize, page: 0 },
            },
          }}
          sx={{
            '& .MuiDataGrid-cell--editing': {
              bgcolor: 'rgb(255,215,115, 0.19)',
              padding: '0 !important',
              '& .MuiInputBase-root': {
                height: '100%',
              },
            },
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: 'rgba(0, 51, 160, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(0, 51, 160, 0.12)',
              },
            },
            '& .status-actif': { 
              color: 'green',
              fontWeight: 'bold' 
            },
            '& .status-inactif': { 
              color: '#888',
              fontStyle: 'italic'
            },
            '& .status-maintenance': { 
              color: 'orange',
              fontWeight: 'bold' 
            },
            '& .status-en_attente': {
              color: '#888',
              fontStyle: 'italic'
            },
            '& .status-en_cours': {
              color: 'blue',
              fontWeight: 'bold'
            },
            '& .status-terminee': {
              color: 'green',
              fontWeight: 'bold'
            },
            '& .status-annulee': {
              color: 'red',
              fontWeight: 'bold'
            },
            '& .status-En-cours': {
              color: 'blue',
              fontWeight: 'bold'
            },
            '& .status-Livré': {
              color: 'green',
              fontWeight: 'bold'
            }
          }}
        />
      </Box>
    </Paper>
  );
};

export default DataTable; 
