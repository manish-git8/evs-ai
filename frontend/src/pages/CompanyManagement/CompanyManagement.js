import React, { useEffect, useState, useRef } from 'react';
import './ReactBootstrapTable.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash, Upload, Check, Download, FileText } from 'react-feather';
import { Row, Col } from 'reactstrap';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { FaSort } from 'react-icons/fa';
import CompanyService from '../../services/CompanyService';
import CompanyCategoryService from '../../services/CompanyCategoryService';
import ComponentCard from '../../components/ComponentCard';
import { formatDate } from '../localStorageUtil';

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [importedCompanies, setImportedCompanies] = useState([]);
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [isImportMode, setIsImportMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [tableKey, setTableKey] = useState(Date.now());
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [subCategoryMap, setSubCategoryMap] = useState({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pageNumber, setPageNumber] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const onSortChange = (sortName, sortOrder) => {
    console.log('Sort changed:', sortName, sortOrder);
    setSortField(sortName);
    setSortOrder(sortOrder);
  };

  const options = {
    paginationShowsTotal: false,
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    onSortChange: onSortChange,
  };

  const fetchCategories = async () => {
    if (categories.length > 0 && Object.keys(subCategoryMap).length > 0) {
      return;
    }

    setIsLoadingCategories(true);
    try {
      const response = await CompanyCategoryService.getCompanyCategory();
      const categoriesData = response.data || [];

      const categoryMapping = {};
      categoriesData.forEach((cat) => {
        if (cat.categoryName && cat.categoryId) {
          categoryMapping[cat.categoryName.toLowerCase().trim()] = cat.categoryId;
        }
      });

      setCategories(categoriesData);
      setCategoryMap(categoryMapping);

      await fetchAllSubCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchAllSubCategories = async (categoriesList) => {
    try {
      const allSubCategories = [];
      const subCategoryMapping = {};

      const subCategoryPromises = categoriesList
        .filter((category) => category.categoryId)
        .map((category) =>
          CompanyCategoryService.getCompanySubCategory(category.categoryId)
            .then((subCatResponse) => ({ category, subCats: subCatResponse.data || [] }))
            .catch((error) => {
              console.error(
                `Error fetching subcategories for category ${category.categoryId}:`,
                error,
              );
              return { category, subCats: [] };
            }),
        );

      const results = await Promise.all(subCategoryPromises);

      results.forEach(({ category, subCats }) => {
        subCats.forEach((subCat) => {
          if (subCat.subCategoryName && subCat.subCategoryId) {
            const key = `${category.categoryId}_${subCat.subCategoryName.toLowerCase().trim()}`;
            subCategoryMapping[key] = subCat.subCategoryId;
            subCategoryMapping[subCat.subCategoryName.toLowerCase().trim()] = subCat.subCategoryId;
          }
          allSubCategories.push(subCat);
        });
      });

      setSubCategoryMap(subCategoryMapping);
    } catch (error) {
      console.error('Error fetching all subcategories:', error);
    }
  };

  const findCategoryId = (categoryName) => {
    if (!categoryName) return 0;

    const normalizedName = categoryName.toLowerCase().trim();

    if (categoryMap[normalizedName]) {
      return categoryMap[normalizedName];
    }

    for (const [name, id] of Object.entries(categoryMap)) {
      if (name.includes(normalizedName) || normalizedName.includes(name)) {
        return id;
      }
    }

    const foundCategory = categories.find((cat) => {
      if (!cat.categoryName) return false;
      const catName = cat.categoryName.toLowerCase().trim();
      return (
        catName === normalizedName ||
        catName.includes(normalizedName) ||
        normalizedName.includes(catName)
      );
    });

    return foundCategory ? foundCategory.categoryId : 0;
  };

  const findSubCategoryId = (subCategoryName, categoryName = '') => {
    if (!subCategoryName) return 0;

    const normalizedSubName = subCategoryName.toLowerCase().trim();
    const normalizedCatName = categoryName.toLowerCase().trim();

    const categoryId = findCategoryId(categoryName);

    if (categoryId) {
      const key = `${categoryId}_${normalizedSubName}`;
      if (subCategoryMap[key]) {
        return subCategoryMap[key];
      }
    }

    if (subCategoryMap[normalizedSubName]) {
      return subCategoryMap[normalizedSubName];
    }

    for (const [key, id] of Object.entries(subCategoryMap)) {
      const subCatName = key.split('_').pop();
      if (subCatName.includes(normalizedSubName) || normalizedSubName.includes(subCatName)) {
        return id;
      }
    }

    return 0;
  };

  const handleNavigate = () => {
    navigate('/company-registration');
  };

  const handleEdit = (companyId) => {
    navigate(`/company-registration/${companyId}`);
  };

  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleDelete = async (companyId) => {
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
        await CompanyService.deleteCompany(companyId);
        const updatedCompanies = companies.filter((company) => company.companyId !== companyId);
        setCompanies(updatedCompanies);
        Swal.fire('Deleted!', 'Your company has been deleted.', 'success');
      } catch (error) {
        console.error('Error deleting company:', error);
        Swal.fire('Error!', 'There was a problem deleting the company.', 'error');
      }
    }
  };

  const fetchCompanies = async () => {
    try {
      const pageDto = {
        pageSize,
        pageNumber,
        sortBy: sortField || 'createdDate',
        order: sortOrder.toUpperCase(),
      };

      let response;
      if (debouncedSearchTerm.trim() === '') {
        response = await CompanyService.getAllCompaniesSorting(pageDto);
      } else {
        response = await CompanyService.getCompanyBySearch(debouncedSearchTerm, pageDto);
      }

      setCompanies(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      toast.error('Error loading companies');
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [debouncedSearchTerm, sortField, sortOrder, pageNumber, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const renderActionButtons = (cell, row) => {
    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className="btn btn-sm btn-primary me-2 action-button-edit"
          onClick={() => handleEdit(row.companyId)}
          disabled={isUploading || isProcessingFile}
        >
          <Edit size={14} />
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger action-button-delete"
          onClick={() => handleDelete(row.companyId)}
          disabled={isUploading || isProcessingFile}
        >
          <Trash size={14} />
        </button>
      </div>
    );
  };

  const handleBulkImportClick = async () => {
    await fetchCategories();

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
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

        let sheetName = workbook.SheetNames.find((name) =>
          name.toLowerCase().includes('company onboarding'),
        );

        if (!sheetName) {
          sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes('company'));
        }

        if (!sheetName && workbook.SheetNames.length > 0) {
          sheetName = workbook.SheetNames[0];
        }

        if (!sheetName) {
          toast.error('Excel file contains no valid sheets');
          setIsProcessingFile(false);
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const allData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        let headerRowIndex = -1;
        let headers = [];

        for (let i = 0; i < Math.min(10, allData.length); i++) {
          const row = allData[i];
          if (row && row.some((cell) => cell && cell.toString().trim() !== '')) {
            headers = row.map((cell) => (cell ? cell.toString().trim().replace(/"/g, '') : ''));
            headerRowIndex = i;
            break;
          }
        }

        if (headers.length === 0 || headerRowIndex === -1) {
          toast.error('No headers found in Excel file');
          setIsProcessingFile(false);
          return;
        }

        const columnIndices = {};
        headers.forEach((header, index) => {
          if (header && header.trim() !== '') {
            if (!columnIndices[header]) {
              columnIndices[header] = [];
            }
            columnIndices[header].push(index);
          }
        });

        const getColumnValue = (row, headerName, occurrence = 0) => {
          const indices = columnIndices[headerName];
          if (indices && indices[occurrence] !== undefined) {
            const value = row[indices[occurrence]];
            return value !== undefined && value !== null ? value.toString().trim() : '';
          }
          return '';
        };

        const companiesData = [];
        const errors = [];

        for (let i = headerRowIndex + 1; i < allData.length; i++) {
          const row = allData[i];

          if (
            !row ||
            row.length === 0 ||
            row.every((cell) => !cell || (cell.toString && cell.toString().trim() === ''))
          ) {
            continue;
          }

          try {
            const name = getColumnValue(row, 'NAME*', 0) || '';
            const email = getColumnValue(row, 'EMAIL ID*', 0) || '';

            if (!name || !email) {
              errors.push(`Row ${i + 1}: Missing NAME or EMAIL ID`);
              continue;
            }

            const company = {
              name: name,
              displayName: getColumnValue(row, 'DISPLAY NAME*', 0) || name,
              email: email,
              website: getColumnValue(row, 'WEBSITE', 0) || '',
              fax: getColumnValue(row, 'FAX', 0) || '',
              phone: getColumnValue(row, 'PHONE NUMBER*', 0) || '',

              companyCategory: getColumnValue(row, 'COMPANY  CATEGORY*', 0) || '',
              companySubCategory: getColumnValue(row, 'COMPANY SUB CATEGORY*', 0) || '',

              billingAddressLine1: getColumnValue(row, 'Address Line 1*', 0) || '',
              billingAddressLine2: getColumnValue(row, 'Address Line 2', 0) || '',
              billingStreet: getColumnValue(row, 'Street', 0) || '',
              billingState: getColumnValue(row, 'State', 0) || '',
              billingCity: getColumnValue(row, 'City', 0) || '',
              billingCountry: getColumnValue(row, 'Country', 0) || '',
              billingPostalCode: getColumnValue(row, 'Postal Code', 0) || '',
              billingCountryCode: getColumnValue(row, 'Country Code', 0) || '',

              sameAsBillingAddress: getColumnValue(row, 'SAME AS BILLING ADDRESS', 0) || 'NO',
              shippingAddressLine1: getColumnValue(row, 'Address Line', 0) || '',
              shippingAddressLine2: getColumnValue(row, 'Address Line 2', 1) || '',
              shippingStreet: getColumnValue(row, 'Street', 1) || '',
              shippingCity: getColumnValue(row, 'City', 1) || '',
              shippingState: getColumnValue(row, 'State', 1) || '',
              shippingCountry: getColumnValue(row, 'Country', 1) || '',
              shippingPostalCode: getColumnValue(row, 'Postal Code', 1) || '',
              shippingCountryCode: getColumnValue(row, 'Country Code', 1) || '',

              primaryContactTitle: getColumnValue(row, 'Title*', 0) || '',
              primaryContactFirstName: getColumnValue(row, 'First Name*', 0) || '',
              primaryContactLastName: getColumnValue(row, 'Last Name*', 0) || '',
              primaryContactEmail: getColumnValue(row, 'Email ID*', 1) || '',
              primaryContactPhone: getColumnValue(row, 'Phone', 0) || '',
              primaryContactPhoneExt: getColumnValue(row, 'Phone Ext.', 0) || '',
              primaryContactMobile: getColumnValue(row, 'Mobile Number*', 0) || '',
              primaryContactUsername: getColumnValue(row, 'Username*', 0) || '',

              primaryContactAddressLine1: getColumnValue(row, 'Address Line 1*', 1) || '',
              primaryContactAddressLine2: getColumnValue(row, 'Address Line 2', 2) || '',
              primaryContactCity: getColumnValue(row, 'City', 2) || '',
              primaryContactState: getColumnValue(row, 'State', 2) || '',
              primaryContactCountry: getColumnValue(row, 'Country', 2) || '',
              primaryContactPostalCode: getColumnValue(row, 'Postal Code', 2) || '',
              primaryContactCountryCode: getColumnValue(row, 'Country Code', 2) || '',

              secondaryContactTitle: getColumnValue(row, 'Title', 1) || '',
              secondaryContactFirstName: getColumnValue(row, 'First Name', 1) || '',
              secondaryContactLastName: getColumnValue(row, 'Last Name', 1) || '',
              secondaryContactEmail: getColumnValue(row, 'Email ID', 2) || '',
              secondaryContactPhone: getColumnValue(row, 'Phone', 1) || '',
              secondaryContactPhoneExt: getColumnValue(row, 'Phone Ext.', 1) || '',
              secondaryContactMobile: getColumnValue(row, 'Mobile Number', 1) || '',
              secondaryContactUsername: getColumnValue(row, 'Username', 1) || '',

              secondaryContactAddressLine1: getColumnValue(row, 'Address Line 1', 2) || '',
              secondaryContactAddressLine2: getColumnValue(row, 'Address Line 2', 3) || '',
              secondaryContactCity: getColumnValue(row, 'City', 3) || '',
              secondaryContactState: getColumnValue(row, 'State', 3) || '',
              secondaryContactCountry: getColumnValue(row, 'Country', 3) || '',
              secondaryContactPostalCode: getColumnValue(row, 'Postal Code', 3) || '',
              secondaryContactCountryCode: getColumnValue(row, 'Country Code', 3) || '',
            };

            company.tempId = `temp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
            companiesData.push(company);
          } catch (error) {
            console.error(`Error processing row ${i + 1}:`, error);
            errors.push(`Row ${i + 1}: ${error.message}`);
          }
        }

        if (companiesData.length === 0) {
          toast.error('No valid company data found in the Excel file');
          setIsProcessingFile(false);
          return;
        }

        if (errors.length > 0) {
          toast.warning(
            <div>
              Loaded {companiesData.length} companies
              <br />
              <small>{errors.length} rows had errors</small>
            </div>,
          );
        }

        setImportedCompanies(companiesData);
        setSelectedCompanies(companiesData.map((c) => c.tempId));
        setIsImportMode(true);
        setIsProcessingFile(false);

        toast.success(`Successfully loaded ${companiesData.length} companies for import`);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error processing Excel file. Please check the file format.');
        setIsProcessingFile(false);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast.error('Error reading file. Please try again.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleSelectCompany = (tempId) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(tempId)) {
        return prev.filter((id) => id !== tempId);
      } else {
        return [...prev, tempId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedCompanies.length === importedCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(importedCompanies.map((c) => c.tempId));
    }
  };

  const handleImportCompanies = async () => {
    if (selectedCompanies.length === 0) {
      toast.error('Please select at least one company to import');
      return;
    }

    if (isLoadingCategories) {
      toast.error('Categories are still loading. Please wait.');
      return;
    }

    if (categories.length === 0) {
      toast.error('No categories available. Please check category setup.');
      return;
    }

    setIsUploading(true);
    setImportProgress({ current: 0, total: selectedCompanies.length });

    try {
      const companiesToImport = importedCompanies
        .filter((company) => selectedCompanies.includes(company.tempId))
        .map(({ tempId, ...companyData }) => companyData);

      const results = {
        success: [],
        failed: [],
      };

      for (let i = 0; i < companiesToImport.length; i++) {
        const company = companiesToImport[i];

        try {
          if (!company.name || !company.email) {
            throw new Error('NAME and EMAIL ID are required');
          }

          const categoryId = findCategoryId(company.companyCategory);
          const subCategoryId = findSubCategoryId(
            company.companySubCategory,
            company.companyCategory,
          );

          if (!categoryId) {
            throw new Error(
              `Category "${company.companyCategory}" not found. Available categories: ${categories
                .map((c) => c.categoryName)
                .join(', ')}`,
            );
          }

          const requestBody = {
            name: company.name,
            displayName: company.displayName,
            email: company.email,
            website: company.website || '',
            fax: company.fax || '',
            phone: company.phone || '',

            categoryId: categoryId,
            subCategoryId: subCategoryId,

            companyId: 0,
            companyLogoId: 0,
            companySignatureId: 0,

            billingAddress: {
              addressId: 0,
              companyId: 0,
              addressLine1: company.billingAddressLine1 || '',
              addressLine2: company.billingAddressLine2 || '',
              addressType: 'BILLING',
              street: company.billingStreet || '',
              city: company.billingCity || '',
              state: company.billingState || '',
              postalCode: company.billingPostalCode || '',
              country: company.billingCountry || '',
              isoCountryCode: company.billingCountryCode || '',
            },

            shippingAddresses:
              company.sameAsBillingAddress === 'YES'
                ? [
                    {
                      addressId: 0,
                      companyId: 0,
                      addressLine1: company.billingAddressLine1 || '',
                      addressLine2: company.billingAddressLine2 || '',
                      addressType: 'SHIPPING',
                      street: company.billingStreet || '',
                      city: company.billingCity || '',
                      state: company.billingState || '',
                      postalCode: company.billingPostalCode || '',
                      country: company.billingCountry || '',
                      isoCountryCode: company.billingCountryCode || '',
                    },
                  ]
                : [
                    {
                      addressId: 0,
                      companyId: 0,
                      addressLine1: company.shippingAddressLine1 || '',
                      addressLine2: company.shippingAddressLine2 || '',
                      addressType: 'SHIPPING',
                      street: company.shippingStreet || '',
                      city: company.shippingCity || '',
                      state: company.shippingState || '',
                      postalCode: company.shippingPostalCode || '',
                      country: company.shippingCountry || '',
                      isoCountryCode: company.shippingCountryCode || '',
                    },
                  ],

            primaryContact: {
              userId: 0,
              title: company.primaryContactTitle || '',
              firstName: company.primaryContactFirstName || '',
              lastName: company.primaryContactLastName || '',
              email: company.primaryContactEmail || company.email,
              entityId: 0,
              entityType: 'COMPANY',
              phone: company.primaryContactPhone || company.phone || '',
              ext: company.primaryContactPhoneExt || '',
              mobile: company.primaryContactMobile || '',
              userName: company.primaryContactUsername || '',
              parentId: 0,
              profileImageId: 0,
              delegateId: 0,
              userContactType: 'PRIMARY',
              isActive: true,
              delegateStartDate: null,
              delegateEndDate: null,
              delegateSetDate: null,
              address: {
                addressId: 0,
                companyId: 0,
                addressLine1: company.primaryContactAddressLine1 || '',
                addressLine2: company.primaryContactAddressLine2 || '',
                addressType: 'CONTACT',
                street: '',
                city: company.primaryContactCity || '',
                state: company.primaryContactState || '',
                postalCode: company.primaryContactPostalCode || '',
                country: company.primaryContactCountry || '',
                isoCountryCode: company.primaryContactCountryCode || '',
              },
              role: [],
              createdDate: null,
            },

            secondaryContact: company.secondaryContactEmail
              ? {
                  userId: 0,
                  title: company.secondaryContactTitle || '',
                  firstName: company.secondaryContactFirstName || '',
                  lastName: company.secondaryContactLastName || '',
                  email: company.secondaryContactEmail || '',
                  entityId: 0,
                  entityType: 'COMPANY',
                  phone: company.secondaryContactPhone || '',
                  ext: company.secondaryContactPhoneExt || '',
                  mobile: company.secondaryContactMobile || '',
                  userName: company.secondaryContactUsername || '',
                  parentId: 0,
                  profileImageId: 0,
                  delegateId: 0,
                  userContactType: 'SECONDARY',
                  isActive: true,
                  delegateStartDate: null,
                  delegateEndDate: null,
                  delegateSetDate: null,
                  address: {
                    addressId: 0,
                    companyId: 0,
                    addressLine1: company.secondaryContactAddressLine1 || '',
                    addressLine2: company.secondaryContactAddressLine2 || '',
                    addressType: 'CONTACT',
                    street: '',
                    city: company.secondaryContactCity || '',
                    state: company.secondaryContactState || '',
                    postalCode: company.secondaryContactPostalCode || '',
                    country: company.secondaryContactCountry || '',
                    isoCountryCode: company.secondaryContactCountryCode || '',
                  },
                  role: [],
                  createdDate: null,
                }
              : null,

            createdDate: null,
          };

          console.log('Sending API request:', requestBody);

          const response = await CompanyService.handleCreateCompany(requestBody);

          results.success.push({
            name: company.name,
            data: response.data,
          });
        } catch (error) {
          const errorMsg =
            error.response?.data?.errorMessage ||
            error.response?.data?.message ||
            error.message ||
            'Unknown error';

          results.failed.push({
            name: company.name || `Company ${i + 1}`,
            error: errorMsg,
          });
        }

        setImportProgress({
          current: i + 1,
          total: companiesToImport.length,
        });
      }

      if (results.failed.length === 0) {
        toast.success(`Successfully imported ${results.success.length} companies`);
        Swal.fire({
          title: 'Import Successful!',
          text: `Successfully imported ${results.success.length} companies.`,
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
      setImportedCompanies([]);
      setSelectedCompanies([]);
      setImportProgress({ current: 0, total: 0 });
      setTableKey(Date.now());

      setTimeout(() => {
        fetchCompanies();
      }, 500);
    } catch (error) {
      console.error('Error importing companies:', error);
      toast.error('Failed to import companies. Please try again.');
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
        setImportedCompanies([]);
        setSelectedCompanies([]);
        setImportProgress({ current: 0, total: 0 });
        setTableKey(Date.now());
      }
    });
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const sheetName = 'Company Onboarding';

      const headers = [
        'NAME*',
        'DISPLAY NAME*',
        'EMAIL ID*',
        'WEBSITE',
        'FAX',
        'PHONE NUMBER*',
        'COMPANY  CATEGORY*',
        'COMPANY SUB CATEGORY*',
        'Address Line 1*',
        'Address Line 2',
        'Street',
        'State',
        'City',
        'Country',
        'Postal Code',
        'Country Code',
        'SAME AS BILLING ADDRESS',
        'Address Line',
        'Address Line 2',
        'Street',
        'City',
        'State',
        'Country',
        'Postal Code',
        'Country Code',
        'Title(for primary contact details)*',
        'First Name*',
        'Last Name*',
        'Email ID*',
        'Phone',
        'Phone Ext.',
        'Mobile Number*',
        'Username*',
        'Address Line 1*',
        'Address Line 2',
        'City',
        'State',
        'Country',
        'Postal Code',
        'Country Code',
        'Title(or secondary contact details)',
        'First Name',
        'Last Name',
        'Email ID',
        'Phone',
        'Phone Ext.',
        'Mobile Number',
        'Username',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Country',
        'Postal Code',
        'Country Code',
      ];

      const allData = [headers];

      const worksheet = XLSX.utils.aoa_to_sheet(allData);

      const colWidths = headers.map(() => ({ wch: 20 }));
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const fileName = `Company_Onboarding_Template.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Company template downloaded successfully!');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Failed to download template. Please try again.');
    }
  };

  const importActionsFormatter = (cell, row) => {
    const isSelected = selectedCompanies.includes(row.tempId);
    return (
      <div className="d-flex justify-content-center">
        <button
          type="button"
          className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
          onClick={() => handleSelectCompany(row.tempId)}
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

  const importOptions = {
    ...options,
    noDataText: 'No companies imported. Please upload an Excel file.',
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
          <ComponentCard title="Company Management List">
            <div className="d-flex justify-content-between align-items-end responsive-container mb-3">
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by company..."
                  className="form-control"
                  disabled={isImportMode || isUploading || isProcessingFile}
                />
              </div>
              <div className="d-flex gap-2">
                {!isImportMode ? (
                  <>
                    <button
                      className="btn btn-outline-info d-flex align-items-center"
                      type="button"
                      onClick={handleDownloadTemplate}
                      disabled={isUploading || isProcessingFile}
                      title="Download import template"
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
                      Add New
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
                      disabled={isUploading || isProcessingFile || importedCompanies.length === 0}
                    >
                      {selectedCompanies.length === importedCompanies.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                    <button
                      className="btn btn-primary d-flex align-items-center"
                      type="button"
                      onClick={handleImportCompanies}
                      disabled={isUploading || isProcessingFile || selectedCompanies.length === 0}
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
                        `Import Selected (${selectedCompanies.length})`
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
                disabled={isUploading || isProcessingFile || isLoadingCategories}
              />
            </div>

            {isImportMode ? (
              <div className="import-preview">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">
                    Import Preview
                    <span className="ms-2 text-muted">
                      ({selectedCompanies.length} of {importedCompanies.length} selected)
                    </span>
                  </h5>
                </div>
                <div className="table-responsive">
                  <BootstrapTable
                    key={`import-${tableKey}`}
                    striped
                    hover
                    condensed
                    data={importedCompanies}
                    pagination={importedCompanies.length > 10}
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
                      width="20%"
                      dataField="name"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Company Name <FaSort />
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="15%"
                      dataField="displayName"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Display Name
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="20%"
                      dataField="email"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Email
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="15%"
                      dataField="phone"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Phone
                    </TableHeaderColumn>
                    <TableHeaderColumn
                      width="20%"
                      dataField="companyCategory"
                      dataAlign="left"
                      headerAlign="left"
                      dataSort
                      thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                      tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    >
                      Category
                    </TableHeaderColumn>
                  </BootstrapTable>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <BootstrapTable
                  key={`main-${tableKey}`}
                  striped
                  hover
                  condensed
                  data={companies}
                  pagination={companies.length > 10}
                  options={options}
                  tableHeaderClass="mb-0"
                  tableStyle={{ width: '100%', tableLayout: 'fixed' }}
                >
                  <TableHeaderColumn
                    width="18%"
                    dataField="name"
                    dataAlign="left"
                    headerAlign="left"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Company Name <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="18%"
                    dataField="displayName"
                    isKey
                    dataAlign="left"
                    headerAlign="left"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Display Name <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="20%"
                    dataField="email"
                    dataAlign="left"
                    headerAlign="left"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Email <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="16%"
                    dataField="phone"
                    dataAlign="left"
                    headerAlign="left"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Phone <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="18%"
                    dataField="createdDate"
                    dataAlign="left"
                    headerAlign="left"
                    dataSort
                    dataFormat={(cell) => formatDate(cell)}
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Created Date <FaSort />
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    width="10%"
                    dataFormat={renderActionButtons}
                    dataAlign="center"
                    headerAlign="center"
                    dataSort
                    thStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                    tdStyle={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
                {companies.length > 0 && (
                  <nav className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                      Showing {pageNumber * pageSize + 1} to{' '}
                      {Math.min((pageNumber + 1) * pageSize, totalPages)} of {totalPages}{' '}
                      Companies
                    </small>

                    <ul className="pagination custom-paging mb-0">
                      <li className={`page-item ${pageNumber === 0 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPageNumber(0)}>
                          &laquo;
                        </button>
                      </li>

                      <li className={`page-item ${pageNumber === 0 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setPageNumber(pageNumber - 1)}>
                          &lt;
                        </button>
                      </li>

                      {[...Array(totalPages)].map((_, index) => (
                        <li
                          key={index}
                          className={`page-item ${pageNumber === index ? 'active' : ''}`}
                        >
                          <button className="page-link" onClick={() => setPageNumber(index)}>
                            {index + 1}
                          </button>
                        </li>
                      ))}

                      <li
                        className={`page-item ${pageNumber === totalPages - 1 ? 'disabled' : ''}`}
                      >
                        <button className="page-link" onClick={() => setPageNumber(pageNumber + 1)}>
                          &gt;
                        </button>
                      </li>

                      <li
                        className={`page-item ${pageNumber === totalPages - 1 ? 'disabled' : ''}`}
                      >
                        <button className="page-link" onClick={() => setPageNumber(totalPages - 1)}>
                          &raquo;
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            )}
          </ComponentCard>
        </Col>
      </Row>
    </div>
  );
};

export default CompanyManagement;
