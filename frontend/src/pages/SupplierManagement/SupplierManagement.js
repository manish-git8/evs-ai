import React, { useEffect, useState, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash, Upload, Check, Download, FileText } from 'react-feather';
import Swal from 'sweetalert2';
import { Row, Col } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import * as XLSX from 'xlsx';
import SupplierService from '../../services/SupplierService';
import SupplierCategoryService from '../../services/SupplierCategoryService';
import '../CompanyManagement/ReactBootstrapTable.scss';
import { FaSort } from 'react-icons/fa';
import ComponentCard from '../../components/ComponentCard';
import { formatDate } from '../localStorageUtil';

const SupplierManagement = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [importedSuppliers, setImportedSuppliers] = useState([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [isImportMode, setIsImportMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [categories, setCategories] = useState([]);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await SupplierCategoryService.getAllSupplierCategories();
        const allCategories = response.data.content || [];
        const parentCategories = allCategories.filter((cat) => !cat.parentId);
        setCategories(parentCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const onSortChange = (sortName, sortOrder) => {
    setSortField(sortName);
    setSortOrder(sortOrder);
  };

  const fetchSuppliers = async () => {
    try {
      const pageDto = {
        pageSize,
        pageNumber,
        sortBy: sortField || 'createdDate',
        order: sortOrder.toUpperCase(),
      };

      const response =
        debouncedSearchTerm.trim() === ''
          ? await SupplierService.getAllSupplierSorting(pageDto)
          : await SupplierService.getSupplierBySearchSorting(debouncedSearchTerm, pageDto);

      setSuppliers(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
    } catch (error) {
      toast.error('Error fetching suppliers');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [debouncedSearchTerm, sortField, sortOrder, pageNumber, pageSize]);

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleNavigate = () => {
    navigate('/supplier-registration');
  };

  const handleEdit = (supplierId) => {
    navigate(`/supplier-registration/${supplierId}`);
  };

  const handleDelete = async (supplierId) => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Delete',
    });

    if (confirmDelete.isConfirmed) {
      try {
        await SupplierService.deleteSupplier(supplierId);
        setSuppliers(suppliers.filter((supplier) => supplier.supplierId !== supplierId));
        Swal.fire('Deleted!', 'Your supplier has been deleted.', 'success');
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const handleBulkImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    const validTypes = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(fileExtension)) {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)');
      event.target.value = '';
      return;
    }
    event.target.value = '';
    setIsProcessingFile(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        let jsonData;
        try {
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            blankrows: false,
            raw: false,
          });
        } catch (jsonError) {
          const range = XLSX.utils.decode_range(worksheet['!ref']);
          jsonData = [];
          for (let R = range.s.r; R <= range.e.r; R++) {
            const row = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = { c: C, r: R };
              const cellRef = XLSX.utils.encode_cell(cellAddress);
              const cell = worksheet[cellRef];
              row.push(cell ? cell.v : '');
            }
            jsonData.push(row);
          }
        }

        if (!jsonData || jsonData.length === 0) {
          toast.error('Excel file is empty');
          setIsProcessingFile(false);
          return;
        }

        if (jsonData.length < 2) {
          toast.error('Excel file only contains headers. Please add data rows.');
          setIsProcessingFile(false);
          return;
        }

        const headers = jsonData[0].map((cell) => (cell ? cell.toString().trim() : ''));
        const normalize = (str) => str?.toString().trim().toUpperCase().replace(/\s+/g, ' ');

        const normalizedHeaders = headers.map(normalize);

        const requiredFields = [
          'NAME (SUPPLIER NAME)*',
          'DISPLAY NAME*',
          'EMAIL ID*',
          'CURRENCY*',
          'CONTACT NUMBER*',
          'CATEGORY*',
          'SUB CATEGORY*',
          'ADDRESS LINE 1*',
          'COUNTRY*',
          'POSTAL CODE*',
          'COUNTRY CODE*',
        ];

        const missingHeaders = requiredFields.filter(
          (field) => !normalizedHeaders.includes(normalize(field)),
        );

        if (missingHeaders.length > 0) {
          toast.error(`Missing columns: ${missingHeaders.join(', ')}`);
          setIsProcessingFile(false);
          return;
        }

        const suppliersData = [];
        const errors = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];

          if (
            !row ||
            row.length === 0 ||
            row.every((cell) => !cell || cell.toString().trim() === '')
          ) {
            continue;
          }

          try {
            const rowData = {};
            headers.forEach((header, index) => {
              const value = row[index] !== undefined ? row[index] : '';
              rowData[header] = value ? value.toString().trim() : '';
            });

            const missingFields = [];

            if (!rowData['NAME (Supplier Name)*'] || rowData['NAME (Supplier Name)*'] === '') {
              missingFields.push('Supplier Name');
            }
            if (!rowData['EMAIL ID*'] || rowData['EMAIL ID*'] === '') {
              missingFields.push('Email ID');
            }
            if (!rowData['DISPLAY NAME*'] || rowData['DISPLAY NAME*'] === '') {
              missingFields.push('Display Name');
            }
            if (!rowData['CONTACT NUMBER*'] || rowData['CONTACT NUMBER*'] === '') {
              missingFields.push('Contact Number');
            }
            if (!rowData['CATEGORY*'] || rowData['CATEGORY*'] === '') {
              missingFields.push('Category');
            }
            if (!rowData['SUB CATEGORY*'] || rowData['SUB CATEGORY*'] === '') {
              missingFields.push('Sub Category');
            }
            if (!rowData['ADDRESS LINE 1*'] || rowData['ADDRESS LINE 1*'] === '') {
              missingFields.push('Address Line 1');
            }
            if (!rowData['COUNTRY*'] || rowData['COUNTRY*'] === '') {
              missingFields.push('Country');
            }
            if (!rowData['POSTAL CODE*'] || rowData['POSTAL CODE*'] === '') {
              missingFields.push('Postal Code');
            }
            if (!rowData['COUNTRY CODE*'] || rowData['COUNTRY CODE*'] === '') {
              missingFields.push('Country Code');
            }

            if (missingFields.length > 0) {
              const errorMsg = `Row ${i + 1}: Missing - ${missingFields.join(', ')}`;
              errors.push(errorMsg);
              continue;
            }

            const categoryName = rowData['CATEGORY*'];
            const subCategoryName = rowData['SUB CATEGORY*'];

            let categoryIds = [];
            let subCategoryId = '';

            if (categoryName) {
              const parentCategory = categories.find(
                (cat) =>
                  cat.categoryName &&
                  cat.categoryName.toString().toLowerCase().trim() ===
                    categoryName.toLowerCase().trim(),
              );

              if (!parentCategory) {
                const errorMsg = `Row ${i + 1}: Category "${categoryName}" not found in system`;
                errors.push(errorMsg);
                continue;
              }

              categoryIds.push(parentCategory.categoryId);

              if (subCategoryName) {
                const subCategory = parentCategory.subCategories?.find(
                  (sub) =>
                    sub.categoryName &&
                    sub.categoryName.toString().toLowerCase().trim() ===
                      subCategoryName.toLowerCase().trim(),
                );

                if (!subCategory) {
                  const errorMsg = `Row ${
                    i + 1
                  }: Sub-category "${subCategoryName}" not found under "${categoryName}"`;
                  errors.push(errorMsg);
                  continue;
                }

                subCategoryId = subCategory.categoryId.toString();
                categoryIds.push(subCategory.categoryId);
              }
            }

            const supplier = {
              name: rowData['NAME (Supplier Name)*'],
              displayName: rowData['DISPLAY NAME*'],
              email: rowData['EMAIL ID*'],
              salesEmail: rowData['SALES EMAIL ID'] || rowData['EMAIL ID*'],
              customerServicePhone: rowData['CUSTOMER SERVICE NUMBER'] || '',
              website: rowData['WEBSITE'] || '',
              currency: (rowData['CURRENCY*'] || 'INR').toUpperCase(),
              primaryContact: rowData['CONTACT NUMBER*'],
              categoryIds: categoryIds,
              subCategoryId: subCategoryId,
              shippingMethodId: '',
              paymentTermsId: '',
              address: {
                addressLine1: rowData['ADDRESS LINE 1*'],
                addressLine2: rowData['ADDRESS LINE 2'] || '',
                addressType: 'SHIPPING',
                city: rowData['CITY'] || '',
                state: rowData['STATE'] || '',
                postalCode: rowData['POSTAL CODE*'],
                country: rowData['COUNTRY*'],
                isoCountryCode: rowData['COUNTRY CODE*'],
              },
            };

            supplier.tempId = `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
            suppliersData.push(supplier);
          } catch (error) {
            console.error(`Error processing row ${i}:`, error);
            errors.push(`Row ${i + 1}: ${error.message}`);
          }
        }

        if (suppliersData.length === 0) {
          if (errors.length > 0) {
            toast.error(
              <div>
                No valid suppliers found
                <br />
                <small>{errors.length} error(s) encountered</small>
              </div>,
            );
          } else {
            toast.error('No valid supplier data found. Please check the Excel file format.');
          }
          setIsProcessingFile(false);
          return;
        }

        if (errors.length > 0) {
          toast.warning(
            <div>
              Loaded {suppliersData.length} suppliers
              <br />
              <small>{errors.length} rows had errors</small>
            </div>,
          );
        } else {
          toast.success(`Successfully loaded ${suppliersData.length} suppliers`);
        }

        setImportedSuppliers(suppliersData);
        setSelectedSuppliers(suppliersData.map((s) => s.tempId));
        setIsImportMode(true);
        setIsProcessingFile(false);
      } catch (error) {
        toast.error(`Error: ${error.message}`);
        setIsProcessingFile(false);
      }
    };

    reader.onerror = (error) => {
      toast.error('Error reading file. Please try again.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSelectSupplier = (tempId) => {
    setSelectedSuppliers((prev) => {
      if (prev.includes(tempId)) {
        return prev.filter((id) => id !== tempId);
      } else {
        return [...prev, tempId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === importedSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(importedSuppliers.map((s) => s.tempId));
    }
  };

  const handleImportSuppliers = async () => {
    if (selectedSuppliers.length === 0) {
      toast.error('Please select at least one supplier to import');
      return;
    }

    setIsUploading(true);
    setImportProgress({ current: 0, total: selectedSuppliers.length });

    try {
      const suppliersToImport = importedSuppliers
        .filter((supplier) => selectedSuppliers.includes(supplier.tempId))
        .map(({ tempId, ...supplierData }) => supplierData);

      const results = {
        success: [],
        failed: [],
      };

      for (let i = 0; i < suppliersToImport.length; i++) {
        const supplier = suppliersToImport[i];

        try {
          if (!supplier.name || !supplier.email) {
            throw new Error('Name and Email are required');
          }
          const categoryIds = Array.isArray(supplier.categoryIds)
            ? supplier.categoryIds.map((id) => parseInt(id, 10))
            : [];

          const requestBody = {
            name: supplier.name,
            displayName: supplier.displayName || supplier.name,
            email: supplier.email,
            customerServicePhone: supplier.customerServicePhone || '',
            salesEmail: supplier.salesEmail || supplier.email,
            website: supplier.website || '',
            currency: supplier.currency || 'USD',
            primaryContact: supplier.primaryContact || '',
            categoryIds: categoryIds,
            subCategoryId: supplier.subCategoryId ? parseInt(supplier.subCategoryId, 10) : '',
            shippingMethodId: supplier.shippingMethodId || '',
            paymentTermsId: supplier.paymentTermsId || '',
            address: {
              addressLine1: supplier.address.addressLine1 || '',
              addressLine2: supplier.address.addressLine2 || '',
              addressType: 'SHIPPING',
              city: supplier.address.city || '',
              state: supplier.address.state || '',
              postalCode: supplier.address.postalCode || '',
              country: supplier.address.country || '',
              isoCountryCode: supplier.address.isoCountryCode || '',
            },
          };

          const response = await SupplierService.handleCreateSupplier(requestBody);

          results.success.push({
            name: supplier.name,
            data: response.data,
          });
        } catch (error) {
          const errorMsg =
            error.response?.data?.errorMessage ||
            error.response?.data?.message ||
            error.message ||
            'Unknown error';

          results.failed.push({
            name: supplier.name || `Supplier ${i + 1}`,
            error: errorMsg,
          });
        }

        setImportProgress({
          current: i + 1,
          total: suppliersToImport.length,
        });
      }

      if (results.failed.length === 0) {
        toast.success(`Successfully imported ${results.success.length} suppliers`);
        Swal.fire({
          title: 'Import Successful!',
          text: `Successfully imported ${results.success.length} suppliers.`,
          icon: 'success',
          confirmButtonText: 'OK',
        });
      } else {
        const successCount = results.success.length;
        const failedCount = results.failed.length;

        toast.warning(
          <div>
            Import completed with {failedCount} error(s)
            <br />
            <small>
              Success: {successCount}, Failed: {failedCount}
            </small>
          </div>,
        );

        Swal.fire({
          title: 'Import Results',
          html: `
            <div style="text-align: left;">
              <h5>Summary:</h5>
              <p>✅ Successfully imported: <strong class="text-success">${successCount}</strong></p>
              <p>❌ Failed to import: <strong class="text-danger">${failedCount}</strong></p>
              
              ${
                failedCount > 0
                  ? `
                <hr />
                <h5>Failed Imports:</h5>
                <div style="max-height: 300px; overflow-y: auto; font-size: 12px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                  ${results.failed
                    .map(
                      (f, index) => `
                    <div class="mb-2 p-2 border-bottom">
                      <strong>${index + 1}. ${f.name}</strong><br/>
                      <span class="text-danger">${f.error}</span>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
            </div>
          `,
          icon: failedCount > 0 ? 'warning' : 'success',
          confirmButtonText: 'OK',
          width: '600px',
        });
      }

      setIsImportMode(false);
      setImportedSuppliers([]);
      setSelectedSuppliers([]);
      setImportProgress({ current: 0, total: 0 });
      fetchSuppliers();
    } catch (error) {
      console.error('Error importing suppliers:', error);
      toast.error('Failed to import suppliers. Please try again.');
      Swal.fire({
        title: 'Import Failed',
        text: 'An unexpected error occurred during import.',
        icon: 'error',
        confirmButtonText: 'OK',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelImport = () => {
    Swal.fire({
      title: 'Cancel Import?',
      text: 'All imported data will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'No, keep data',
    }).then((result) => {
      if (result.isConfirmed) {
        setIsImportMode(false);
        setImportedSuppliers([]);
        setSelectedSuppliers([]);
        setImportProgress({ current: 0, total: 0 });
      }
    });
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const sheetName = 'Supplier Onboarding';

      const headers = [
        'NAME (Supplier Name)*',
        'DISPLAY NAME*',
        'EMAIL ID*',
        'SALES EMAIL ID',
        'CUSTOMER SERVICE NUMBER',
        'WEBSITE',
        'CURRENCY*',
        'CONTACT NUMBER*',
        'CATEGORY*',
        'SUB CATEGORY*',
        'ADDRESS LINE 1*',
        'ADDRESS LINE 2',
        'COUNTRY*',
        'STATE',
        'CITY',
        'POSTAL CODE*',
        'COUNTRY CODE*',
      ];

      const allData = [headers];
      const worksheet = XLSX.utils.aoa_to_sheet(allData);
      const colWidths = [
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 30 },
        { wch: 30 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 50 },
        { wch: 60 },
        { wch: 25 },
        { wch: 15 },
        { wch: 5 },
      ];

      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      const fileName = `Supplier_Onboarding_Template.xlsx`;

      XLSX.writeFile(workbook, fileName);

      toast.success('Template downloaded successfully! Check the "Supplier Onboarding" sheet.');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to download template. Please try again.');
    }
  };

  const categoryFormatter = (cell, row) => {
    if (!row.categories || row.categories.length === 0) {
      return <span className="text-muted">-</span>;
    }

    // Get unique parent categories (main categories with parentId: null)
    const parentCategories = row.categories
      .filter((cat) => cat.parentId === null)
      .map((cat) => cat.categoryName)
      .filter((name, index, self) => self.indexOf(name) === index);

    if (parentCategories.length === 0) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div>
        {parentCategories.map((name, index) => (
          <span key={index} className="badge bg-info me-1 mb-1">
            {name}
          </span>
        ))}
      </div>
    );
  };

  const subcategoryFormatter = (cell, row) => {
    if (!row.categories || row.categories.length === 0) {
      return <span className="text-muted">-</span>;
    }

    // Group subcategories by their parent category
    const groupedSubcategories = [];
    row.categories.forEach((cat) => {
      if (cat.subCategories && cat.subCategories.length > 0 && cat.parentId === null) {
        groupedSubcategories.push({
          parentName: cat.categoryName,
          subCategories: cat.subCategories,
        });
      }
    });

    if (groupedSubcategories.length === 0) {
      return <span className="text-muted">-</span>;
    }

    return (
      <div>
        {groupedSubcategories.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-2">
            <div
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#6c757d',
                marginBottom: '4px',
              }}
            >
              {group.parentName}
            </div>
            <div>
              {group.subCategories.map((subCat, subIndex) => (
                <span
                  key={subIndex}
                  className="badge bg-secondary me-1 mb-1"
                  style={{ fontSize: '11px' }}
                >
                  {subCat.categoryName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const actionsFormatter = (cell, row) => {
    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleEdit(row.supplierId)}
          disabled={isUploading || isProcessingFile}
        >
          <Edit size={16} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger action-button-delete"
          onClick={() => handleDelete(row.supplierId)}
          disabled={isUploading || isProcessingFile}
        >
          <Trash size={14} />
        </button>
      </div>
    );
  };

  const importActionsFormatter = (cell, row) => {
    const isSelected = selectedSuppliers.includes(row.tempId);
    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => handleSelectSupplier(row.tempId)}
          disabled={isUploading || isProcessingFile}
          style={{ minWidth: '80px' }}
        >
          {isSelected ? (
            <>
              <Check size={14} className="me-1" />
              Selected
            </>
          ) : (
            'Select'
          )}
        </button>
      </div>
    );
  };

  const addressFormatter = (cell, row) => {
    const address = row.address;
    if (!address) return '';

    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    onSortChange: onSortChange,
  };

  const importOptions = {
    ...options,
    noDataText: 'No suppliers imported. Please upload an Excel file.',
  };

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover={false}
        style={{ top: '12px', right: '12px' }}
        toastStyle={{
          marginBottom: '0',
          position: 'absolute',
          top: 0,
          right: 0,
        }}
      />
      <Row>
        <Col md="12">
          <ComponentCard title="Supplier Management">
            <div className="d-flex justify-content-between align-items-end responsive-container mb-3">
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by name..."
                  className="form-control"
                  disabled={isImportMode || isUploading || isProcessingFile}
                />
              </div>
              <div className="d-flex gap-2">
                {!isImportMode ? (
                  <>
                    {/* Download Template Button - Added here */}
                    <button
                      className="btn btn-outline-info d-flex align-items-center"
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={isUploading || isProcessingFile}
                      title="Download template with exact column names"
                    >
                      <FileText size={16} className="me-1" />
                      Download Template
                    </button>

                    <button
                      className="btn btn-info d-flex align-items-center"
                      type="button"
                      onClick={handleBulkImportClick}
                      disabled={isUploading || isProcessingFile}
                    >
                      <Upload size={16} className="me-1" />
                      {isProcessingFile ? 'Processing File...' : 'Bulk Import'}
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={handleNavigate}
                      disabled={isUploading || isProcessingFile}
                    >
                      Add New Supplier
                    </button>
                  </>
                ) : (
                  <div className="d-flex gap-2 align-items-center">
                    {isUploading && (
                      <div className="me-2">
                        <div className="progress" style={{ width: '100px', height: '6px' }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{
                              width: `${(importProgress.current / importProgress.total) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <small className="text-muted">
                          {importProgress.current}/{importProgress.total}
                        </small>
                      </div>
                    )}
                    <button
                      className="btn btn-outline-success"
                      type="button"
                      onClick={handleSelectAll}
                      disabled={isUploading || isProcessingFile || importedSuppliers.length === 0}
                    >
                      {selectedSuppliers.length === importedSuppliers.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                    <button
                      className="btn btn-primary d-flex align-items-center"
                      type="button"
                      onClick={handleImportSuppliers}
                      disabled={isUploading || isProcessingFile || selectedSuppliers.length === 0}
                    >
                      {isUploading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Importing...
                        </>
                      ) : (
                        `Import Selected (${selectedSuppliers.length})`
                      )}
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={handleCancelImport}
                      disabled={isUploading || isProcessingFile}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                disabled={isUploading || isProcessingFile}
              />
            </div>

            {isImportMode ? (
              <div className="import-preview">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    Import Preview
                    <span className="ms-2 text-muted">
                      ({selectedSuppliers.length} of {importedSuppliers.length} selected)
                    </span>
                  </h5>
                </div>
                <div className="table-responsive">
                  <BootstrapTable
                    striped
                    hover
                    condensed
                    data={importedSuppliers}
                    pagination={importedSuppliers.length > 10}
                    options={importOptions}
                    tableHeaderClass="mb-0"
                    tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                    keyField="tempId"
                  >
                    <TableHeaderColumn
                      dataField="tempId"
                      dataFormat={importActionsFormatter}
                      dataAlign="center"
                      headerAlign="center"
                      width="10%"
                    >
                      Select
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="name"
                      dataAlign="left"
                      headerAlign="left"
                      width="15%"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Name <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="email"
                      dataAlign="left"
                      headerAlign="left"
                      width="18%"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Email <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="primaryContact"
                      dataAlign="left"
                      headerAlign="left"
                      width="12%"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Contact <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="address"
                      dataFormat={addressFormatter}
                      dataAlign="left"
                      headerAlign="left"
                      width="25%"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Address <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      dataField="categoryIds"
                      dataAlign="left"
                      headerAlign="left"
                      width="20%"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      dataFormat={(cell) => {
                        if (!cell || !Array.isArray(cell)) return 'Not specified';
                        const categoryNames = categories
                          .filter((cat) => cell.includes(cat.categoryId))
                          .map((cat) => cat.categoryName);
                        return categoryNames.join(', ');
                      }}
                    >
                      Categories <FaSort />
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <BootstrapTable
                  striped
                  hover
                  condensed
                  data={suppliers}
                  pagination={suppliers.length > 10}
                  options={options}
                  tableHeaderClass="mb-0"
                  tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                >
                  <TableHeaderColumn
                    isKey
                    dataField="name"
                    dataAlign="left"
                    headerAlign="left"
                    width="12%"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Name <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="displayName"
                    dataAlign="left"
                    headerAlign="left"
                    width="10%"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Display Name <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="email"
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Email <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="categories"
                    dataFormat={categoryFormatter}
                    dataAlign="left"
                    headerAlign="left"
                    width="15%"
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Category
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="createdDate"
                    dataAlign="left"
                    width="12%"
                    headerAlign="left"
                    dataSort
                    dataFormat={(cell) => formatDate(cell)}
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Created Date <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="primaryContact"
                    dataAlign="left"
                    headerAlign="left"
                    width="10%"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Phone <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="actions"
                    dataFormat={actionsFormatter}
                    dataAlign="center"
                    headerAlign="center"
                    width="9%"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
                {/* Supplier Table here */}

                {suppliers.length > 0 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted ms-2">
                      Showing {pageNumber * pageSize + 1} to{' '}
                      {Math.min((pageNumber + 1) * pageSize, totalElements)}
                      of {totalElements} Suppliers
                    </small>

                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${pageNumber === 0 && 'disabled'}`}>
                        <button className="page-link" onClick={() => setPageNumber(0)}>
                          &laquo;
                        </button>
                      </li>

                      <li className={`page-item ${pageNumber === 0 && 'disabled'}`}>
                        <button className="page-link" onClick={() => setPageNumber(pageNumber - 1)}>
                          &lt;
                        </button>
                      </li>

                      {[...Array(totalPages)].map((_, index) => (
                        <li key={index} className={`page-item ${index === pageNumber && 'active'}`}>
                          <button className="page-link" onClick={() => setPageNumber(index)}>
                            {index + 1}
                          </button>
                        </li>
                      ))}

                      <li className={`page-item ${pageNumber === totalPages - 1 && 'disabled'}`}>
                        <button className="page-link" onClick={() => setPageNumber(pageNumber + 1)}>
                          &gt;
                        </button>
                      </li>
                      <li className={`page-item ${pageNumber === totalPages - 1 && 'disabled'}`}>
                        <button className="page-link" onClick={() => setPageNumber(totalPages - 1)}>
                          &raquo;
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default SupplierManagement;
