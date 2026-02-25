import React, { useEffect, useState, useRef } from 'react';
import { BootstrapTable, TableHeaderColumn } from 'react-bootstrap-table';
import {
  Row,
  Col,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  Label,
  Input,
} from 'reactstrap';
import { Download, FileText, Eye, Trash2 } from 'react-feather';
import { FaSort } from 'react-icons/fa';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2';
import { useNavigate, useLocation } from 'react-router-dom';
import { Formik, ErrorMessage, Form } from 'formik';
import * as Yup from 'yup';
import '../CompanyManagement/ReactBootstrapTable.scss';
import ComponentCard from '../../components/ComponentCard';
import GrnService from '../../services/GrnService';
import { formatDate, getEntityId } from '../localStorageUtil';
import ReceiptService from '../../services/RecieptService';
import FileUploadService from '../../services/FileUploadService';
import UserService from '../../services/UserService';
import PurchaseOrderService from '../../services/PurchaseOrderService';

const GrnReceipt = () => {
  const companyId = getEntityId();
  const debounceTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectGrnModalOpen, setSelectGrnModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [selectedGrnGroup, setSelectedGrnGroup] = useState(null);
  const [addNewModalOpen, setAddNewModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [poDetails, setPoDetails] = useState(null);
  const [checkingPo, setCheckingPo] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [employees, setEmployees] = useState([]);
  const [visibleItems, setVisibleItems] = useState([]);
  const [uploadedFilePreview, setUploadedFilePreview] = useState(null);
  const [orderNo, setOrderNo] = useState('N/A');
  const [sortBy, setSortBy] = useState('receivedDateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dragActive, setDragActive] = useState(false);
  const [allGrnData, setAllGrnData] = useState([]);
  const [grnCurrentPage, setGrnCurrentPage] = useState(0);
  const [grnTotalElements, setGrnTotalElements] = useState(0);
  const [grnLoading, setGrnLoading] = useState(false);
  const [userPageSize, setUserPageSize] = useState(100);
  const [userPageNumber, setUserPageNumber] = useState(0);
  const [userSortBy, setUserSortBy] = useState('firstName');
  const [userSortOrder, setUserSortOrder] = useState('asc');
  const grnPageSize = 10;

  const isInitialMount = useRef(true);
  const fetchAllGrn = async (pageNumber = 0) => {
    try {
      setGrnLoading(true);
      const response = await GrnService.getGRNsPaginated(
        companyId,
        grnPageSize,
        pageNumber,
        debouncedSearchTerm,
        '',
        '',
        { sortBy, order: sortOrder },
      );

      const grnDataWithOrderNo =
        response.data?.content?.map((grn) => ({
          ...grn,
          orderNo: grn.purchaseOrderNumber || 'N/A',
        })) || [];

      setGrnTotalElements(response.data?.totalElements || 0);
      setAllGrnData(grnDataWithOrderNo);
      setGrnCurrentPage(pageNumber);
    } catch (error) {
      console.error('Error fetching GRNs:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Not found');
    } finally {
      setGrnLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = () => {
      setGrnCurrentPage(0);
      fetchAllGrn(0);
    };

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchData();
    } else {
      const timer = setTimeout(() => {
        fetchData();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [sortBy, sortOrder, debouncedSearchTerm]);
  const handleSearchInputChange = (event) => {
    setSearchTerm(event.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectGrn = async (grnId) => {
    if (!grnId) {
      toast.dismiss();
      toast.error('Please select a GRN');
      return;
    }

    try {
      const grnResponse = await GrnService.getGRNsPaginated(companyId, 1, 0, '', grnId);
      const responseData = grnResponse.data?.content
        ? grnResponse.data.content
        : grnResponse.data || [];

      if (responseData.length === 0) {
        toast.error('GRN not found');
        return;
      }

      const updatedGrn = responseData[0];
      setSelectedGrn(updatedGrn);
      setSelectedGrnGroup(null);

      setOrderNo(updatedGrn.purchaseOrderNumber || 'N/A');

      let documentId = null;
      if (updatedGrn.document && updatedGrn.document.fileId) {
        documentId = updatedGrn.document.fileId;
      } else if (updatedGrn.documentId) {
        documentId = updatedGrn.documentId;
      }

      if (documentId) {
        try {
          const response = await FileUploadService.getFileByFileId(documentId);
          const fileBlob = new Blob([response.data], {
            type: response.headers['content-type'] || 'application/octet-stream',
          });
          const fileUrl = URL.createObjectURL(fileBlob);
          const fileName = updatedGrn.document?.fileName || `GRN_${updatedGrn.grnId}_document`;
          const fileType =
            updatedGrn.document?.contentType ||
            response.headers['content-type'] ||
            'application/octet-stream';

          setPreviewFile({
            url: fileUrl,
            name: fileName,
            type: fileType,
          });
        } catch (fileError) {
          console.error('Error fetching file:', fileError);
          setPreviewFile(null);
        }
      } else {
        setPreviewFile(null);
      }

      setSelectGrnModalOpen(false);
      setDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching GRN details or file:', error);
      setPreviewFile(null);
      toast.dismiss();
      toast.error('Failed to load GRN details');
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy === field) {
      return sortOrder === 'asc' ? <FaSort /> : <FaSort />;
    }
    return <FaSort />;
  };

  useEffect(() => {
    setGrnCurrentPage(0);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchCompanyUser = async () => {
    try {
      let response;

      const pageDto = {
        pageSize: userPageSize,
        pageNumber: userPageNumber,
        sortBy: userSortBy,
        order: userSortOrder,
      };

      if (debouncedSearchTerm.trim() === '') {
        response = await UserService.fetchAllUsers(companyId, pageDto);
      } else {
        response = await UserService.getUsersBySearch(debouncedSearchTerm, companyId, pageDto);
      }
      setEmployees(response?.data?.content || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to fetch users');
    }
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const supplierResponse = await SupplierService.getAllSupplier();
        setSuppliers(supplierResponse.data.content || []);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      }
    };

    const fetchCompanyUser = async () => {
      try {
        const response = await UserService.fetchAllUsers(companyId);
        setEmployees(response.data);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchSuppliers();
    fetchCompanyUser();
  }, [companyId]);

  useEffect(() => {
    fetchCompanyUser();
  }, [companyId, debouncedSearchTerm, userPageSize, userPageNumber, userSortBy, userSortOrder]);

  const options = {
    hideSizePerPage: true,
    paginationPosition: 'bottom',
    page: grnCurrentPage + 1,
    sizePerPage: grnPageSize,
    totalSize: grnTotalElements,
    onPageChange: (page) => {
      const pageIndex = page - 1;
      setGrnCurrentPage(pageIndex);
      fetchAllGrn(pageIndex);
    },
    paginationShowsTotal: (start, to, total) => (
      <span style={{ fontSize: '12px', color: '#6c757d' }}>
        Showing {start} to {to} of {total} GRNs
      </span>
    ),
  };

  const handleCreateReceipt = async (grnId) => {
    try {
      const response = await ReceiptService.handleCreateReceipt(companyId, grnId);
      const { fileId } = response.data;

      Swal.fire({
        icon: 'success',
        title: 'Receipt Created',
        showCancelButton: true,
        confirmButtonText: 'OK',
        cancelButtonText: 'Download Receipt',
      }).then(async (result) => {
        if (result.isConfirmed) {
          toast.dismiss();
          toast.success(`Receipt created successfully for GRN ID: ${grnId}`);
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          try {
            const downloadResponse = await FileUploadService.downloadFile(fileId);
            const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Receipt_${fileId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.dismiss();
            toast.success('Receipt downloaded successfully');
          } catch (downloadError) {
            console.error('Error downloading receipt:', downloadError);
            toast.dismiss();
            toast.error('Failed to download receipt PDF');
          }
        }
      });
    } catch (error) {
      console.error('Error creating receipt:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'An unexpected error occurred');
    }
  };

  const toggleDetailsModal = () => {
    setDetailsModalOpen(!detailsModalOpen);
    if (!detailsModalOpen) {
      setSelectedGrn(null);
      setSelectedGrnGroup(null);
      setPreviewFile(null);
    }
  };

  const handleQuantityChange = (e, index, setFieldValue) => {
    const { name, value } = e.target;
    setFieldValue(name, value);
    if (value && value > 0) {
      setFieldValue(`items[${index}].isSelected`, true);
    }
  };

  const handleDeleteGRN = async (grnId) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        await GrnService.deleteGRN(companyId, grnId);
        Swal.fire('Deleted!', 'GRN has been deleted.', 'success');
        fetchAllGrn();
        if (detailsModalOpen) {
          toggleDetailsModal();
        }
      }
    } catch (error) {
      console.error('Error deleting GRN:', error);
      Swal.fire('Error!', error.response?.data?.errorMessage || 'Failed to delete GRN', 'error');
    }
  };

  const toggleSelectGrnModal = () => {
    setSelectGrnModalOpen(!selectGrnModalOpen);
    if (!selectGrnModalOpen) {
      setSelectedGrnGroup(null);
    }
  };

  const toggleAddNewModal = () => {
    if (!addNewModalOpen) {
      fetchCompanyUser();
    }
    setAddNewModalOpen(!addNewModalOpen);
    setSelectedFile(null);
    setFileUploaded(false);
    setUploadedFileId(null);
    setUploadedFilePreview(null);
    setPoDetails(null);
    setFileInputKey(Date.now());
    setIsUploading(false);
    if (uploadedFilePreview?.url) {
      URL.revokeObjectURL(uploadedFilePreview.url);
    }
  };

  const handleFileChange = async (event) => {
    if (selectedFile) {
      URL.revokeObjectURL(selectedFile);
    }
    if (uploadedFilePreview?.url) {
      URL.revokeObjectURL(uploadedFilePreview.url);
    }

    const file = event.target.files[0];
    if (!file) {
      setSelectedFile(null);
      setFileUploaded(false);
      setUploadedFilePreview(null);
      return;
    }

    setSelectedFile(file);
    setFileUploaded(false);
    setUploadedFilePreview(null);
    setIsUploading(true);

    try {
      const existingFiles = JSON.parse(localStorage.getItem(`uploadedFiles_${companyId}`)) || [];
      const updatedFiles = existingFiles.filter((f) => f.grnId !== selectedGrn?.grnId);
      const response = await FileUploadService.uploadFile(companyId, file);
      const { fileId } = response.data;
      setUploadedFileId(fileId);

      const fileDetails = {
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        grnId: selectedGrn?.grnId || null,
        purchaseOrderId: poDetails?.PurchaseOrderId || null,
        contentType: file.type,
      };

      localStorage.setItem(
        `uploadedFiles_${companyId}`,
        JSON.stringify([...updatedFiles, fileDetails]),
      );

      const fileBlob = new Blob([file], { type: file.type });
      const fileUrl = URL.createObjectURL(fileBlob);
      const previewObject = {
        url: fileUrl,
        name: file.name,
        type: file.type,
      };
      console.log('Setting uploadedFilePreview:', previewObject);
      setUploadedFilePreview(previewObject);

      setFileUploaded(true);
      toast.dismiss();
      toast.success('File uploaded successfully. Please fill in the details.');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.dismiss();
      toast.error(error.response?.data?.errorMessage || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const checkPoId = async (poNumber) => {
    if (!poNumber) {
      setPoDetails(null);
      return null;
    }

    setCheckingPo(true);
    try {
      const response = await PurchaseOrderService.getPurchaseOrdersPaginated(companyId, {
        pageSize: 100,
        pageNumber: 0,
        orderNo: poNumber,
      });

      const responseData =
        response.data && response.data.content ? response.data.content : response.data || [];
      if (responseData && Array.isArray(responseData) && responseData.length > 0) {
        const poData = responseData[0];
        setPoDetails({
          PurchaseOrderId: poData.purchaseOrderId || poData.id || poData.PurchaseOrderId,
          purchaseOrderNo: poData.orderNo,
          supplier: poData.supplier || {},
          shippingToAddress: poData.shippingToAddress || {},
          notes: poData.notes || '',
          orderStatus: poData.orderStatus || 'N/A',
          orderAmount: poData.orderAmount || 0,
          locationId: poData.location?.locationId || null,
          departmentId: poData.department?.departmentId || null,
          deliveryDate: poData.deliveryDate || 'N/A',
          orderItemDetails: poData.orderItemDetails.map((item) => ({
            ...item,
            quantityRemaining: poData.quantityGrnRemaining,
            departmentId: item.department?.departmentId || null,
          })),
        });

        await fetchCompanyUser();

        return poData;
      }
      setPoDetails(null);
      return null;
    } catch (error) {
      console.error('Error fetching Purchase Order:', error);
      setPoDetails(null);
      return null;
    } finally {
      setCheckingPo(false);
    }
  };

  useEffect(() => {
    const incomingState = location.state;
    if (incomingState?.fileUploaded && incomingState?.fromPurchaseOrderDetail) {
      setUploadedFileId(incomingState.uploadedFileId);
      setUploadedFilePreview(incomingState.uploadedFilePreview);
      setFileUploaded(true);
      if (incomingState.purchaseOrderNo) {
        checkPoId(incomingState.purchaseOrderNo);
      }
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const getInitialValues = () => ({
    purchaseOrderNo: poDetails?.purchaseOrderNo || '',
    purchaseOrderId: poDetails?.PurchaseOrderId || '',
    receivedDate: new Date().toISOString().split('T')[0],
    items: poDetails?.orderItemDetails
      ? poDetails.orderItemDetails.map((item) => ({
          purchaseOrderDetailId: item.purchaseOrderDetailId,
          quantityReceived: '',
          quantityAccepted: '',
          quantityConfirmed: item.quantityConfirmed || 0,
          quantityRemaining: item.quantityGrnRemaining,
          isSelected: false,
        }))
      : [],
    receivedBy: '',
    verifiedBy: '',
    notes: '',
    locationId: poDetails?.locationId || '',
    departmentId: poDetails?.orderItemDetails?.[0]?.departmentId || null,
  });

  const handleCreateGRN = async (values) => {
    console.log('🚀 STARTING GRN CREATION - handleCreateGRN called with values:', values);
    try {
      const filteredItems = values.items.filter(
        (item) =>
          item.isSelected &&
          (parseInt(item.quantityReceived, 10) > 0 || parseInt(item.quantityAccepted, 10) > 0),
      );

      if (filteredItems.length === 0) {
        toast.dismiss();
        toast.error(
          'At least one item must be selected and have a received/accepted quantity greater than 0.',
        );
        return;
      }

      const invalidItems = filteredItems.filter(
        (item) =>
          item.quantityReceived === '' ||
          item.quantityAccepted === '' ||
          item.quantityReceived === null ||
          item.quantityAccepted === null ||
          item.quantityReceived === undefined ||
          item.quantityAccepted === undefined,
      );

      if (invalidItems.length > 0) {
        toast.dismiss();
        toast.error(
          'Quantity Received and Quantity Accepted cannot be blank for any selected item.',
        );
        return;
      }

      const requestBody = {
        grnId: values.grnId || 0,
        invoiceId: values.invoiceId || 0,
        PurchaseOrderId: parseInt(values.purchaseOrderId, 10),
        company: {
          companyId,
          displayName: '',
          name: '',
        },
        locationId: values.locationId || poDetails?.locationId || 0,
        DepartmentId: values.departmentId || poDetails?.orderItemDetails?.[0]?.departmentId || 0,
        supplier: {
          supplierId: poDetails?.supplier?.supplierId || 0,
        },
        notes: values.notes || '',
        receivedDateTime: new Date().toISOString(),
        receivedBy: {
          userId: parseInt(values.receivedBy, 10) || 0,
        },
        verifiedBy: {
          userId: parseInt(values.verifiedBy, 10) || 0,
        },
        verifiedDate: new Date().toISOString(),
        isActive: true,
        documentId: uploadedFileId || null,
        status: 'created',
        grnDetails: filteredItems.map((item) => {
          const poDetail = poDetails.orderItemDetails.find(
            (detail) => detail.purchaseOrderDetailId === item.purchaseOrderDetailId,
          );

          return {
            grnId: 0,
            catalogItemId: poDetail?.catalogItem?.CatalogItemId || '',
            partId: poDetail?.partId || '',
            partDescription: poDetail?.partDescription || '',
            unitPrice: poDetail?.unitPrice || 0,
            unitOfMeasurement: poDetail?.unitOfMeasurement || '',
            poDetailId: item.purchaseOrderDetailId,
            qtyReceived: parseInt(item.quantityReceived, 10) || 0,
            qtyAccepted: parseInt(item.quantityAccepted, 10) || 0,
            qtyConfirmed: parseInt(item.quantityConfirmed, 10) || 0,
            reason: item.quantityReceived !== item.quantityAccepted ? values.notes : '',
            receivedBy: values.receivedBy,
            verifiedBy: values.verifiedBy,
          };
        }),
      };

      console.log('📤 CALLING API - GrnService.handleCreateGRN with requestBody:', requestBody);
      const response = await GrnService.handleCreateGRN(companyId, requestBody);
      console.log('✅ API SUCCESS - Response received:', response);
      toast.dismiss();
      toast.success('GRN created successfully!');
      console.log('🎉 SUCCESS TOAST SHOWN - GRN created successfully');

      const existingFiles = JSON.parse(localStorage.getItem(`uploadedFiles_${companyId}`)) || [];
      const updatedFiles = existingFiles.filter((file) => file.grnId !== response.data.grnId);

      const newFile = {
        fileId: uploadedFileId,
        fileName:
          selectedFile?.name || uploadedFilePreview?.name || `GRN_${response.data.grnId}_document`,
        uploadDate: new Date().toISOString(),
        fileSize: selectedFile?.size || 0,
        fileType: selectedFile?.type || uploadedFilePreview?.type || 'application/octet-stream',
        purchaseOrderId: values.purchaseOrderId,
        receivedDate: values.receivedDate,
        grnId: response.data.grnId,
      };

      localStorage.setItem(
        `uploadedFiles_${companyId}`,
        JSON.stringify([...updatedFiles, newFile]),
      );

      setSelectedFile(null);
      setFileUploaded(false);
      setUploadedFileId(null);
      setUploadedFilePreview(null);
      setPoDetails(null);
      setFileInputKey(Date.now());
      setAddNewModalOpen(false);
      fetchAllGrn();
    } catch (error) {
      console.log('❌ CATCH BLOCK TRIGGERED - Error caught:', error);
      console.log('Error type:', typeof error);
      console.log('Error response:', error.response);
      console.log('Error response status:', error.response?.status);
      console.log('Error response data:', error.response?.data);

      toast.dismiss();

      if (error.response && error.response.status >= 200 && error.response.status < 300) {
        console.log('✅ SUCCESS IN CATCH - This is actually a successful response');
        toast.success('GRN created successfully!');
        const existingFiles = JSON.parse(localStorage.getItem(`uploadedFiles_${companyId}`)) || [];
        const updatedFiles = existingFiles.filter(
          (file) => file.grnId !== error.response.data?.grnId,
        );
        const newFile = {
          fileId: uploadedFileId,
          fileName:
            selectedFile?.name ||
            uploadedFilePreview?.name ||
            `GRN_${error.response.data?.grnId}_document`,
          uploadDate: new Date().toISOString(),
          fileSize: selectedFile?.size || 0,
          fileType: selectedFile?.type || uploadedFilePreview?.type || 'application/octet-stream',
          purchaseOrderId: poDetails?.PurchaseOrderId,
          receivedDate: new Date().toISOString(),
          grnId: error.response.data?.grnId,
        };
        updatedFiles.push(newFile);
        localStorage.setItem(`uploadedFiles_${companyId}`, JSON.stringify(updatedFiles));
        setSelectedFile(null);
        setFileUploaded(false);
        setUploadedFileId(null);
        setUploadedFilePreview(null);
        setPoDetails(null);
        setFileInputKey(Date.now());
        setAddNewModalOpen(false);
        fetchAllGrn();
      } else {
        console.log('💥 REAL ERROR - Showing failed toast');
        toast.error(error.response?.data?.errorMessage || 'Failed to create GRN');
        throw error;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (previewFile?.url) {
        URL.revokeObjectURL(previewFile.url);
      }
      if (uploadedFilePreview?.url) {
        URL.revokeObjectURL(uploadedFilePreview.url);
      }
    };
  }, [previewFile, uploadedFilePreview]);

  useEffect(() => {
    if (poDetails?.orderItemDetails?.length > 0) {
      setVisibleItems(poDetails.orderItemDetails.map(() => true));
    }
  }, [poDetails]);

  const handleSubmitDetails = async (values, { setSubmitting }) => {
    console.log('🎯 FORM SUBMISSION - handleSubmitDetails called with values:', values);
    try {
      setSubmitting(true);
      const filteredItems = values.items.filter(
        (item, index) =>
          visibleItems[index] &&
          (parseInt(item.quantityReceived, 10) > 0 || parseInt(item.quantityAccepted, 10) > 0),
      );

      if (filteredItems.length === 0) {
        toast.dismiss();
        toast.error('At least one item must have a received/accepted quantity greater than 0.');
        return;
      }

      const submissionData = {
        ...values,
        items: filteredItems,
      };

      console.log('🔄 CALLING handleCreateGRN with submissionData:', submissionData);
      await handleCreateGRN(submissionData);
      console.log('✅ handleCreateGRN COMPLETED SUCCESSFULLY');
    } catch (error) {
      console.log('💥 ERROR IN FORM SUBMISSION:', error);
      console.error('Error in form submission:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddNew = () => {
    setAddNewModalOpen(true);
  };

  const renderPurchaseOrderLink = (cell, row) => {
    const orderNumber = row.orderNo || 'N/A';
    const words = orderNumber.split(' ');
    const truncatedOrderNo = words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');

    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          navigate(`/purchase-order-detail/${row.PurchaseOrderId}`, {
            state: {
              fromPage: '/grn-receipt',
            },
          });
        }}
        style={{
          color: '#007bff',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'inline-block',
          maxWidth: '100%',
        }}
        title={orderNumber}
      >
        {truncatedOrderNo}
      </a>
    );
  };

  const validationSchema = Yup.object().shape({
    receivedDate: Yup.date().required('Received Date is required'),
    receivedBy: Yup.string().required('Received By is required'),
    verifiedBy: Yup.string().required('Verified By is required'),
    items: Yup.array().of(
      Yup.object().shape({
        quantityConfirmed: Yup.number().nullable(),
        quantityReceived: Yup.number()
          .min(0, 'Quantity Received cannot be negative')
          .test('max-remaining', 'Cannot exceed remaining quantity', (value, context) => {
            const index = context.path.match(/\[(\d+)\]/)?.[1];
            if (index !== undefined && visibleItems[parseInt(index, 10)]) {
              const remainingQty = context.parent.quantityRemaining;
              if (
                remainingQty === undefined ||
                remainingQty === null ||
                value === undefined ||
                value === null
              ) {
                return true;
              }
              return value <= remainingQty;
            }
            return true;
          })
          .nullable(),
        quantityAccepted: Yup.number()
          .min(0, 'Quantity Accepted cannot be negative')
          .test('max-remaining', 'Cannot exceed remaining quantity', (value, context) => {
            const index = context.path.match(/\[(\d+)\]/)?.[1];
            if (index !== undefined && visibleItems[parseInt(index, 10)]) {
              const remainingQty = context.parent.quantityRemaining;
              if (
                remainingQty === undefined ||
                remainingQty === null ||
                value === undefined ||
                value === null
              ) {
                return true;
              }
              return value <= remainingQty;
            }
            return true;
          })
          .test('max-received', 'Cannot exceed received quantity', (value, context) => {
            const receivedQty = context.parent.quantityReceived;
            if (
              receivedQty === undefined ||
              receivedQty === null ||
              value === undefined ||
              value === null
            ) {
              return true;
            }
            return value <= receivedQty;
          })
          .nullable(),
        quantityRemaining: Yup.number().nullable(),
      }),
    ),
  });

  const renderDetailsModalContent = () => {
    if (!selectedGrn) return null;

    const supplier = selectedGrn.supplier || {};
    const companyName = selectedGrn.company?.displayName || selectedGrn.company?.name || 'N/A';

    const receivedByName = selectedGrn.receivedBy
      ? `${selectedGrn.receivedBy.firstName || ''} ${selectedGrn.receivedBy.lastName || ''}`.trim()
      : 'N/A';

    const verifiedByName = selectedGrn.verifiedBy
      ? `${selectedGrn.verifiedBy.firstName || ''} ${selectedGrn.verifiedBy.lastName || ''}`.trim()
      : 'N/A';

    return (
      <div className="d-flex flex-column" style={{ fontSize: '-0.1rem' }}>
        <div className="row mb-3">
          <div className="col-md-6">
            <h6 className="mb-2 text-primary">GRN Information</h6>
            <div>
              <strong>GRN NO:</strong> {selectedGrn.grnNo || 'N/A'}
            </div>
            <div>
              <strong>Company:</strong> {companyName}
            </div>
            <div>
              <strong>Order No:</strong>{' '}
              {selectedGrn.PurchaseOrderId ? (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/purchase-order-detail/${selectedGrn.PurchaseOrderId}`, {
                      state: {
                        fromPage: '/grn-receipt',
                      },
                    });
                  }}
                  style={{
                    color: '#007bff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {orderNo}
                </a>
              ) : (
                'N/A'
              )}
            </div>
            <div>
              <strong>Received By:</strong> {receivedByName} on{' '}
              {formatDate(selectedGrn.receivedDateTime) || 'N/A'}
            </div>
            <div>
              <strong>Verified By:</strong> {verifiedByName} on{' '}
              {formatDate(selectedGrn.verifiedDate) || 'N/A'}
            </div>
          </div>
          <div className="col-md-6">
            <h6 className="mb-2 text-primary">Supplier Information</h6>
            <div>
              <strong>Name:</strong> {supplier.name || supplier.displayName || 'N/A'}
            </div>
            <div>
              <strong>Email:</strong> {supplier.email || 'N/A'}
            </div>
            <div>
              <strong>Phone:</strong> {supplier.customerServicePhone || supplier.phone || 'N/A'}
            </div>
          </div>
        </div>
        <div className="mb-3">
          <h6 className="mb-2 text-primary">Notes</h6>
          <div>{selectedGrn.notes || 'N/A'}</div>
        </div>

        {selectedGrn.grnDetails && selectedGrn.grnDetails.length > 0 && (
          <div className="mb-3">
            <h6 className="mb-2 text-primary">Item Details</h6>
            <div className="table-responsive" style={{ overflowX: 'visible' }}>
              <table className="table table-bordered table-hover" style={{ fontSize: '0.9rem' }}>
                <thead className="thead-light">
                  <tr>
                    <th>Part ID</th>
                    <th>Des.</th>
                    <th>UOM</th>
                    <th>Received</th>
                    <th>Accepted</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedGrn.grnDetails.map((grnDetail) => (
                    <tr key={grnDetail.grnDetailID}>
                      <td>{grnDetail.partId || 'N/A'}</td>
                      <td>{grnDetail.partDescription || 'N/A'}</td>
                      <td>{grnDetail.unitOfMeasurement || 'N/A'}</td>
                      <td>{grnDetail.qtyReceived === 0 ? '0' : grnDetail.qtyReceived || 'N/A'}</td>
                      <td>{grnDetail.qtyAccepted === 0 ? '0' : grnDetail.qtyAccepted || 'N/A'}</td>
                      <td>{grnDetail.unitPrice ? `$${grnDetail.unitPrice.toFixed(2)}` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFilePreview = (file) => {
    if (!file) {
      console.log('No file provided for preview');
      return null;
    }

    console.log('File object in renderFilePreview:', file);

    const isPDF = file.type && file.type.includes('pdf');
    const isImage = file.type && file.type.includes('image');
    const containerStyle = {
      overflow: 'hidden',
      height: 'calc(103vh - 100px)',
      position: 'relative',
      border: '1px solid #ddd',
      borderRadius: '8px',
      width: isPDF ? '100%' : 'auto',
    };

    return (
      <div className="d-flex flex-column align-items-center">
        <div className="d-flex justify-content-between align-items-center w-100 mb-3">
          <h5 className="m-0" style={{ fontWeight: '600', color: '#333' }}>
            File Preview
          </h5>
          <Button
            onClick={() => {
              setFileUploaded(false);
              setSelectedFile(null);
              setUploadedFilePreview(null);
              setFileInputKey(Date.now());
              if (file.url) {
                console.log('Revoking URL:', file.url);
                URL.revokeObjectURL(file.url);
              }
            }}
            style={{
              background: '#fff',
              color: '#dc3545',
              border: '2px solid #dc3545',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            ×
          </Button>
        </div>

        {isPDF ? (
          file.url ? (
            <>
              <div style={containerStyle}>
                <iframe
                  src={file.url}
                  title="PDF Preview"
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </>
          ) : (
            <div style={{ color: 'red' }}>PDF URL is missing. Please upload the file again.</div>
          )
        ) : isImage ? (
          file.url ? (
            <div
              style={{
                height: 'calc(103vh - 100px)',
                width: '100%',
                overflow: 'auto',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TransformWrapper initialScale={1} minScale={0.5} maxScale={3}>
                <TransformComponent>
                  <img
                    src={file.url}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => console.error('Error loading image:', e)}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          ) : (
            <div style={{ color: 'red' }}>Image URL is missing. Please upload the file again.</div>
          )
        ) : (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: '6c757d',
              fontSize: '16px',
            }}
          >
            <div style={{ marginBottom: '10px', fontSize: '48px' }}>📄</div>
            <p style={{ margin: 0 }}>Preview not available for this file type</p>
            <small style={{ color: '#adb5bd' }}>{file.name || 'Unknown file'}</small>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingTop: '24px' }}>
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
          <ComponentCard
            title="GRN Receipt"
            action={
              <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder="Search by supplier, company, order no, receipt no..."
                  className="form-control"
                  style={{ width: '200px' }}
                />
                <Button color="primary" onClick={handleAddNew}>
                  Add New
                </Button>
              </div>
            }
          >
            <div className="table-responsive">
              {grnLoading ? (
                <div className="text-center p-4">
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Loading GRNs...
                </div>
              ) : (
                <BootstrapTable
                  striped
                  hover
                  condensed
                  pagination={grnTotalElements > grnPageSize}
                  remote
                  fetchInfo={{
                    dataTotalSize: grnTotalElements,
                  }}
                  tableHeaderClass="mb-0"
                  data={allGrnData}
                  options={options}
                >
                  <TableHeaderColumn
                    dataField="company"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => {
                      if (!cell) return 'Unknown Company';
                      return cell.displayName || cell.name || 'Unknown Company';
                    }}
                    width="14%"
                    thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    Company
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    isKey
                    dataField="supplierId"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell, row) => {
                      if (row.supplier) {
                        return row.supplier.displayName || row.supplier.name || 'Unknown Supplier';
                      }
                      return 'Unknown Supplier';
                    }}
                    width="14%"
                    thStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    Supplier
                  </TableHeaderColumn>
                  <TableHeaderColumn
                    dataField="orderNo"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={renderPurchaseOrderLink}
                    width="15%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{
                      textAlign: 'left',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '8px',
                      maxWidth: '150px',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('order')}
                    >
                      Order No {renderSortIcon('order')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="receivedDateTime"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => formatDate(cell)}
                    width="12%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('receivedDateTime')}
                    >
                      Received Date {renderSortIcon('receivedDateTime')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="receivedBy"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => {
                      if (cell && typeof cell === 'object') {
                        return `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A';
                      }
                      return 'N/A';
                    }}
                    width="14%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('receivedBy')}
                    >
                      Received By {renderSortIcon('receivedBy')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="verifiedBy"
                    dataAlign="left"
                    headerAlign="left"
                    dataFormat={(cell) => {
                      if (cell && typeof cell === 'object') {
                        return `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A';
                      }
                      return 'N/A';
                    }}
                    width="14%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('verifiedBy')}
                    >
                      Verified By {renderSortIcon('verifiedBy')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="grnNo"
                    dataAlign="left"
                    headerAlign="left"
                    width="8%"
                    thStyle={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      padding: '8px',
                      cursor: 'pointer',
                    }}
                    tdStyle={{ textAlign: 'left', whiteSpace: 'normal', padding: '8px' }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center' }}
                      onClick={() => handleSort('grnNo')}
                    >
                      Receipt# {renderSortIcon('grnNo')}
                    </div>
                  </TableHeaderColumn>

                  <TableHeaderColumn
                    dataField="grnId"
                    dataAlign="center"
                    headerAlign="center"
                    dataFormat={(cell, row) => (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Button
                          color="primary"
                          size="sm"
                          onClick={() => {
                            navigate(`/grn-details/${row.grnId}`, {
                              state: {
                                fromPage: '/grn-receipt',
                              },
                            });
                          }}
                          style={{
                            padding: '5px 8px',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => handleDeleteGRN(row.grnId)}
                          style={{
                            padding: '5px 8px',
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete GRN"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                    width="12%"
                    thStyle={{ textAlign: 'center', whiteSpace: 'normal', padding: '8px' }}
                    tdStyle={{ textAlign: 'center', padding: '8px' }}
                  >
                    Actions
                  </TableHeaderColumn>
                </BootstrapTable>
              )}
            </div>
          </ComponentCard>
        </Col>
      </Row>

      {/* Select GRN Modal */}
      <Modal
        isOpen={selectGrnModalOpen}
        toggle={toggleSelectGrnModal}
        centered
        scrollable
        size="xl"
      >
        <ModalHeader toggle={toggleSelectGrnModal}>
          Select GRN for PO #{selectedGrnGroup?.PurchaseOrderId}
        </ModalHeader>

        <ModalBody>
          <div className="table-responsive">
            <BootstrapTable
              striped
              hover
              condensed
              data={selectedGrnGroup?.grns || []}
              pagination={selectedGrnGroup?.grns?.length > 10}
              options={options}
              tableHeaderClass="mb-0"
              tableStyle={{ width: '100%', tableLayout: 'fixed' }}
            >
              <TableHeaderColumn
                width="10%"
                dataField="grnId"
                isKey
                dataAlign="left"
                headerAlign="left"
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                GRN ID
              </TableHeaderColumn>
              <TableHeaderColumn
                width="15%"
                dataField="receivedDateTime"
                dataAlign="left"
                headerAlign="left"
                dataFormat={(cell) => formatDate(cell)}
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Received Date
              </TableHeaderColumn>
              <TableHeaderColumn
                width="20%"
                dataField="receivedBy"
                dataAlign="left"
                headerAlign="left"
                dataFormat={(cell) => {
                  if (cell && typeof cell === 'object') {
                    return `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A';
                  }
                  return 'N/A';
                }}
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Received By
              </TableHeaderColumn>

              <TableHeaderColumn
                width="20%"
                dataField="verifiedBy"
                dataAlign="left"
                headerAlign="left"
                dataFormat={(cell) => {
                  if (cell && typeof cell === 'object') {
                    return `${cell.firstName || ''} ${cell.lastName || ''}`.trim() || 'N/A';
                  }
                  return 'N/A';
                }}
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Verified By
              </TableHeaderColumn>
              <TableHeaderColumn
                width="20%"
                dataField="grnNo"
                dataAlign="left"
                headerAlign="left"
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Receipt#
              </TableHeaderColumn>
              <TableHeaderColumn
                width="25%"
                dataField="notes"
                dataAlign="left"
                headerAlign="left"
                dataFormat={(cell) => cell || 'N/A'}
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Notes
              </TableHeaderColumn>
              <TableHeaderColumn
                width="10%"
                dataAlign="center"
                headerAlign="center"
                dataFormat={(cell, row) => (
                  <Button color="primary" size="sm" onClick={() => handleSelectGrn(row.grnId)}>
                    View Details
                  </Button>
                )}
                thStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
                tdStyle={{ whiteSpace: 'normal', overflowWrap: 'break-word' }}
              >
                Actions
              </TableHeaderColumn>
            </BootstrapTable>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleSelectGrnModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={detailsModalOpen}
        toggle={toggleDetailsModal}
        size="xl"
        centered
        scrollable
        style={{ maxWidth: '90vw', width: '100%' }}
      >
        <ModalHeader toggle={toggleDetailsModal}>GRN Details for Order : {orderNo}</ModalHeader>
        <ModalBody
          style={{
            display: 'flex',
            overflow: 'hidden',
            maxHeight: '600px',
            padding: '0px',
          }}
        >
          <div style={{ flex: '1', padding: '15px', overflowY: 'auto' }}>
            {renderDetailsModalContent()}
          </div>
          <div
            style={{
              flex: '1',
              padding: '15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {previewFile ? (
              <>
                <div className="mb-2">
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {previewFile.name}
                  </a>
                </div>
                {previewFile.type.includes('pdf') ? (
                  <div style={{ overflow: 'auto', maxHeight: '400px', width: '100%' }}>
                    <iframe
                      src={previewFile.url}
                      title="PDF Preview"
                      width="100%"
                      height="400px"
                      style={{ border: '1px solid #ddd' }}
                    />
                  </div>
                ) : previewFile.type.includes('image') ? (
                  <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                    <img
                      src={previewFile.url}
                      alt="Attached File"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText size={48} />
                    <p className="mt-2">{previewFile.name}</p>
                    <Button color="link" onClick={() => window.open(previewFile.url, '_blank')}>
                      Download to View
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p>No file available for preview</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="primary"
            onClick={() => handleCreateReceipt(selectedGrn?.grnId)}
            disabled={!selectedGrn}
            id={`create-receipt-${selectedGrn?.grnId}`}
          >
            <Download size={14} /> Download Receipt
          </Button>
          <Button
            color="danger"
            onClick={() => handleDeleteGRN(selectedGrn?.grnId)}
            disabled={!selectedGrn}
            style={{ marginLeft: '10px' }}
          >
            Delete GRN
          </Button>
          <Button color="secondary" onClick={toggleDetailsModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add New Modal */}
      <Modal
        isOpen={addNewModalOpen}
        toggle={toggleAddNewModal}
        size="lg"
        centered
        style={{ maxWidth: '99vw', width: '50%' }}
      >
        <ModalHeader toggle={toggleAddNewModal}>Upload GRN Document</ModalHeader>
        <ModalBody>
          <div
            className="dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange({ target: { files: [e.dataTransfer.files[0]] } });
              }
            }}
            style={{
              border: '2px dashed #ccc',
              borderRadius: '5px',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: dragActive ? '#f8f9fa' : 'white',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <input
              id="file-upload-input"
              key={fileInputKey}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={isUploading}
              style={{ display: 'none' }}
            />
            <div className="d-flex flex-column align-items-center">
              <i className="fas fa-cloud-upload-alt fa-3x mb-3 text-muted"></i>
              <h5>Drag & Drop your file here</h5>
              <p className="text-muted">or click to browse files</p>
              <small className="text-muted">Supported formats: PDF, JPG, JPEG, PNG</small>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleAddNewModal}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* File Uploaded Modal */}
      <Modal
        isOpen={fileUploaded}
        toggle={() => setFileUploaded(false)}
        size="xxl"
        centered
        scrollable
        style={{ maxWidth: '99vw', width: '100%' }}
      >
        <ModalHeader toggle={() => setFileUploaded(false)}>Add GRN Details</ModalHeader>
        <ModalBody>
          <Row>
            <Col md="6">{renderFilePreview(uploadedFilePreview)}</Col>

            <Col md="6">
              <h5 className="mb-3">Packing Slip Details</h5>
              <Formik
                initialValues={getInitialValues()}
                enableReinitialize
                validationSchema={validationSchema}
                onSubmit={handleSubmitDetails}
              >
                {({
                  values,
                  errors,
                  touched,
                  handleChange,
                  handleBlur,
                  setFieldValue,
                  isSubmitting,
                }) => (
                  <Form>
                    <Row>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Purchase Order No<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="text"
                            name="purchaseOrderNo"
                            value={values.purchaseOrderNo || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setFieldValue('purchaseOrderNo', newValue);
                              if (debounceTimerRef.current) {
                                clearTimeout(debounceTimerRef.current);
                              }
                              debounceTimerRef.current = setTimeout(() => {
                                checkPoId(newValue).then((poData) => {
                                  if (poData?.purchaseOrderNo) {
                                    setFieldValue('purchaseOrderNo', poData.purchaseOrderNo);
                                    setFieldValue('purchaseOrderId', poData.PurchaseOrderId);
                                  }
                                });
                              }, 1500);
                            }}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.purchaseOrderNo && errors.purchaseOrderNo ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="purchaseOrderNo"
                            component="div"
                            className="invalid-feedback"
                          />
                          {checkingPo && (
                            <small className="text-muted">
                              <i className="fas fa-spinner fa-spin mr-1"></i> Checking Order #...
                            </small>
                          )}
                          {!checkingPo && !poDetails && values.purchaseOrderNo && (
                            <small className="text-danger mt-1">
                              <i className="fas fa-exclamation-circle mr-1"></i> No PO found with
                              this order number
                            </small>
                          )}
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Received Date<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="date"
                            name="receivedDate"
                            disabled={
                              !['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                                poDetails?.orderStatus?.toUpperCase(),
                              )
                            }
                            value={values.receivedDate}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.receivedDate && errors.receivedDate ? ' is-invalid' : ''
                            }`}
                          />
                          <ErrorMessage
                            name="receivedDate"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    {poDetails && (
                      <div className="border p-3 rounded mb-4">
                        {['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED'].includes(
                          poDetails.orderStatus?.toUpperCase(),
                        ) ? (
                          <div className="text-danger">
                            <i className="fas fa-exclamation-circle mr-2"></i>
                            Purchase order is not confirmed
                          </div>
                        ) : (
                          <>
                            <h6 className="mb-3">Purchase Order Information</h6>
                            <div className="row">
                              <div className="col-md-6">
                                <p className="mb-2">
                                  <strong>PO Number:</strong>
                                  <br />
                                  {poDetails.purchaseOrderNo || 'N/A'}
                                </p>
                                <p className="mb-2">
                                  <strong>Supplier:</strong>
                                  <br />
                                  {poDetails.supplier?.displayName || 'N/A'}
                                </p>
                              </div>
                              <div className="col-md-6">
                                <p className="mb-2">
                                  <strong>Shipping Address:</strong>
                                  <br />
                                  {poDetails.shippingToAddress
                                    ? `${poDetails.shippingToAddress.addressLine1 || ''}, 
                  ${poDetails.shippingToAddress.addressLine2 || ''}, 
                  ${poDetails.shippingToAddress.city || ''}, 
                  ${poDetails.shippingToAddress.state || ''}, 
                  ${poDetails.shippingToAddress.country || ''}, 
                  ${poDetails.shippingToAddress.postalCode || ''}`
                                    : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {poDetails?.orderItemDetails?.length > 0 &&
                      ['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                        poDetails.orderStatus?.toUpperCase(),
                      ) && (
                        <div className="mt-4">
                          <div
                            className="table-responsive"
                            style={{
                              overflowX: 'visible',
                              overflowY: poDetails?.orderItemDetails?.length > 4 ? 'auto' : 'unset',
                              maxHeight:
                                poDetails?.orderItemDetails?.length > 4 ? '250px' : 'unset',
                            }}
                          >
                            <table
                              className="table table-bordered table-hover"
                              style={{ fontSize: '0.9rem' }}
                            >
                              <thead className="thead-light">
                                <tr>
                                  <th style={{ width: '50px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        poDetails.orderItemDetails.forEach((item, index) => {
                                          if (visibleItems[index]) {
                                            setFieldValue(`items[${index}].isSelected`, isChecked);
                                            if (isChecked) {
                                              const remainingQty =
                                                values.items[index]?.quantityRemaining || 0;
                                              setFieldValue(
                                                `items[${index}].quantityReceived`,
                                                remainingQty,
                                              );
                                              setFieldValue(
                                                `items[${index}].quantityAccepted`,
                                                remainingQty,
                                              );
                                            } else {
                                              setFieldValue(`items[${index}].quantityReceived`, '');
                                              setFieldValue(`items[${index}].quantityAccepted`, '');
                                            }
                                          }
                                        });
                                      }}
                                      checked={
                                        poDetails.orderItemDetails.filter(
                                          (_, index) => visibleItems[index],
                                        ).length > 0 &&
                                        poDetails.orderItemDetails
                                          .filter((_, index) => visibleItems[index])
                                          .every((_, index) => values.items[index]?.isSelected)
                                      }
                                      className="form-check-input"
                                    />
                                  </th>
                                  <th>Item Description (Part ID)</th>
                                  <th>Qty Confirmed</th>
                                  <th>Qty Remaining</th>
                                  <th>UOM</th>
                                  <th>
                                    Received <span className="text-danger">*</span>
                                  </th>
                                  <th>
                                    Accepted <span className="text-danger">*</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {poDetails.orderItemDetails.map(
                                  (item, index) =>
                                    visibleItems[index] && (
                                      <tr key={item.purchaseOrderDetailId}>
                                        <td style={{ textAlign: 'center', width: '60px' }}>
                                          <input
                                            type="checkbox"
                                            name={`selectItem_${index}`}
                                            checked={values.items[index]?.isSelected || false}
                                            onChange={(e) => {
                                              const isChecked = e.target.checked;
                                              setFieldValue(
                                                `items[${index}].isSelected`,
                                                isChecked,
                                              );
                                              if (isChecked) {
                                                const remainingQty =
                                                  values.items[index]?.quantityRemaining || 0;
                                                setFieldValue(
                                                  `items[${index}].quantityReceived`,
                                                  remainingQty,
                                                );
                                                setFieldValue(
                                                  `items[${index}].quantityAccepted`,
                                                  remainingQty,
                                                );
                                              } else {
                                                setFieldValue(
                                                  `items[${index}].quantityReceived`,
                                                  '',
                                                );
                                                setFieldValue(
                                                  `items[${index}].quantityAccepted`,
                                                  '',
                                                );
                                              }
                                            }}
                                            className="form-check-input"
                                          />
                                        </td>
                                        <td>
                                          {item.partDescription || 'N/A'} (Part ID:{' '}
                                          {item.partId || 'N/A'})
                                        </td>
                                        <td style={{ width: '120px' }}>
                                          <Input
                                            type="number"
                                            name={`items[${index}].quantityConfirmed`}
                                            value={values.items[index]?.quantityConfirmed || 0}
                                            disabled
                                            className="form-control"
                                          />
                                        </td>
                                        <td style={{ width: '120px' }}>
                                          <Input
                                            type="number"
                                            name={`items[${index}].quantityRemaining`}
                                            value={values.items[index]?.quantityRemaining || 0}
                                            disabled
                                            className="form-control"
                                          />
                                        </td>
                                        <td style={{ width: '80px', textAlign: 'center' }}>
                                          {item.unitOfMeasurement || 'N/A'}
                                        </td>
                                        <td style={{ width: '120px' }}>
                                          <Input
                                            type="number"
                                            name={`items[${index}].quantityReceived`}
                                            value={values.items[index]?.quantityReceived ?? ''}
                                            onChange={(e) =>
                                              handleQuantityChange(e, index, setFieldValue)
                                            }
                                            onBlur={handleBlur}
                                            min="0"
                                            className={`form-control${
                                              touched.items?.[index]?.quantityReceived &&
                                              errors.items?.[index]?.quantityReceived
                                                ? ' is-invalid'
                                                : ''
                                            }`}
                                          />

                                          <ErrorMessage
                                            name={`items[${index}].quantityReceived`}
                                            component="div"
                                            className="invalid-feedback"
                                          />
                                        </td>
                                        <td style={{ width: '120px' }}>
                                          <Input
                                            type="number"
                                            name={`items[${index}].quantityAccepted`}
                                            value={values.items[index]?.quantityAccepted ?? ''}
                                            onChange={(e) =>
                                              handleQuantityChange(e, index, setFieldValue)
                                            }
                                            onBlur={handleBlur}
                                            min="0"
                                            max={values.items[index]?.quantityReceived || undefined}
                                            className={`form-control${
                                              touched.items?.[index]?.quantityAccepted &&
                                              errors.items?.[index]?.quantityAccepted
                                                ? ' is-invalid'
                                                : ''
                                            }`}
                                          />
                                          <ErrorMessage
                                            name={`items[${index}].quantityAccepted`}
                                            component="div"
                                            className="invalid-feedback"
                                          />
                                        </td>
                                      </tr>
                                    ),
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    <Row className="mt-3">
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Received By<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="receivedBy"
                            disabled={
                              !['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                                poDetails?.orderStatus?.toUpperCase(),
                              )
                            }
                            value={values.receivedBy}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.receivedBy && errors.receivedBy ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Employee</option>
                            {employees.map((employee) => (
                              <option key={employee.userId} value={employee.userId}>
                                {employee.firstName} {employee.lastName}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="receivedBy"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                      <Col md="6">
                        <FormGroup>
                          <Label>
                            Verified By<span className="text-danger">*</span>
                          </Label>
                          <Input
                            type="select"
                            name="verifiedBy"
                            disabled={
                              !['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                                poDetails?.orderStatus?.toUpperCase(),
                              )
                            }
                            value={values.verifiedBy}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`form-control${
                              touched.verifiedBy && errors.verifiedBy ? ' is-invalid' : ''
                            }`}
                          >
                            <option value="">Select Employee</option>
                            {employees.map((employee) => (
                              <option key={employee.userId} value={employee.userId}>
                                {employee.firstName} {employee.lastName}
                              </option>
                            ))}
                          </Input>
                          <ErrorMessage
                            name="verifiedBy"
                            component="div"
                            className="invalid-feedback"
                          />
                        </FormGroup>
                      </Col>
                    </Row>

                    <FormGroup className="mt-3">
                      <Label>Notes</Label>
                      <Input
                        type="textarea"
                        name="notes"
                        disabled={
                          !['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                            poDetails?.orderStatus?.toUpperCase(),
                          )
                        }
                        value={values.notes}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows="3"
                      />
                    </FormGroup>

                    <div className="d-flex justify-content-end mt-4 gap-2">
                      <Button
                        type="submit"
                        color="primary"
                        disabled={
                          isSubmitting ||
                          !['CONFIRMED', 'PARTIALLY_CONFIRMED'].includes(
                            poDetails?.orderStatus?.toUpperCase(),
                          )
                        }
                      >
                        {isSubmitting ? 'Creating GRN...' : 'Create GRN'}
                      </Button>
                      <Button color="secondary" onClick={() => setFileUploaded(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </Col>
          </Row>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default GrnReceipt;
