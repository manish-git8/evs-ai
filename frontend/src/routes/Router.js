import { lazy, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner } from 'reactstrap';
import Loadable from '../layouts/loader/Loadable';
import PublicRoute from './PublicRoute';
import PrivateRoute from './PrivateRoute';
import { getUserRole } from '../pages/localStorageUtil';

/****Layouts*****/

const FullLayout = Loadable(lazy(() => import('../layouts/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/BlankLayout')));
/***** Pages ****/

const Dashboard = Loadable(lazy(() => import('../pages/Dashboard/Dashboard')));
const Login = Loadable(lazy(() => import('../pages/Login/Login')));
const AdminLogin = Loadable(lazy(() => import('../pages/Login/AdminLogin')));
const Register = Loadable(lazy(() => import('../pages/Register/Register')));
const EmailVerification = Loadable(lazy(() => import('../pages/Auth/EmailVerification')));
const ForgotPassword = Loadable(lazy(() => import('../pages/Auth/ForgotPassword')));
const ResetPasswordWithToken = Loadable(lazy(() => import('../pages/Auth/ResetPasswordWithToken')));
const CompanyRegistration = Loadable(
  lazy(() => import('../pages/CompanyRegistration/CompanyRegistration')),
);
const SupplierRegistration = Loadable(
  lazy(() => import('../pages/SupplierRegistration/SupplierRegistration')),
);

const CompanyManagement = Loadable(
  lazy(() => import('../pages/CompanyManagement/CompanyManagement')),
);
const GetAllCart = Loadable(lazy(() => import('../pages/GetAllCart/GetAllCart')));
const SupplierDashboard = Loadable(
  lazy(() => import('../pages/SupplierDashboard/SupplierDashboard')),
);
const SupplierManagement = Loadable(
  lazy(() => import('../pages/SupplierManagement/SupplierManagement')),
);
const UserRegistration = Loadable(lazy(() => import('../pages/UserRegistration/UserRegistration')));
const UserManagement = Loadable(lazy(() => import('../pages/UserManagement/UserManagement')));
const UserDetails = Loadable(lazy(() => import('../pages/UserDetails/UserDetails')));
const CatalogManagement = Loadable(
  lazy(() => import('../pages/CatalogManagement/CatalogManagement')),
);
const CatalogRegistration = Loadable(
  lazy(() => import('../pages/CatalogRegistration/CatalogRegistration')),
);
const CreateInvoice = Loadable(lazy(() => import('../pages/Invoice/CreateInvoive')));
const CatalogItem = Loadable(lazy(() => import('../pages/CatalogItem/CatalogItem')));
const CatalogItemManagement = Loadable(
  lazy(() => import('../pages/CatalogItemManagement/CatalogItemManagement')),
);
const PurchaseOrder = Loadable(lazy(() => import('../pages/PurchaseOrder/PurchaseOrder')));
const Shipment = Loadable(lazy(() => import('../pages/Shipment/Shipment')));
const RfqList = Loadable(lazy(() => import('../pages/RFQ/RfqList')));
const RfqSupplierList = Loadable(lazy(() => import('../pages/RFQ/RfqSupplierList')));
const CreateRfq = Loadable(lazy(() => import('../pages/RFQ/CreateRfq')));
const RfqDetails = Loadable(lazy(() => import('../pages/RFQ/RfqDetail')));
const RfqSupplierDetails = Loadable(lazy(() => import('../pages/RFQ/RfqSupplierDetails')));
// RfqSupplierResponse route removed - merged into RfqDetail page
const RfqApprovalDetails = Loadable(lazy(() => import('../pages/RFQ/RfqApprovalDetails')));
const QualityCheck = Loadable(lazy(() => import('../pages/QualityCheck/QualityChecklist')));
const Invoice = Loadable(lazy(() => import('../pages/Invoice/Invoice')));
const Invoices = Loadable(lazy(() => import('../pages/Invoice/Invoices')));
const SupplierInvoiceDetails = Loadable(
  lazy(() => import('../pages/SupplierInvoiceDetails/SupplierInvoiceDetails')),
);
const GrnReceipt = Loadable(lazy(() => import('../pages/GrnReciept/GrnReciept')));
const GrnDetails = Loadable(lazy(() => import('../pages/GrnReciept/GrnDetails')));
const Receipt = Loadable(lazy(() => import('../pages/Reciept/Reciept')));
const Voucher = Loadable(lazy(() => import('../pages/Voucher/Voucher')));
const Bills = Loadable(lazy(() => import('../pages/Voucher/Bills')));
const SupplierBills = Loadable(lazy(() => import('../pages/Voucher/SupplierBills')));
const SupplierVoucher = Loadable(lazy(() => import('../pages/Voucher/SupplierVoucher')));
const CreateVoucher = Loadable(lazy(() => import('../pages/Voucher/CreateVoucher')));
const VoucherDetails = Loadable(lazy(() => import('../pages/Voucher/VoucherDetails')));
const FeedbackManagement = Loadable(lazy(() => import('../pages/Feedback/FeedbackManagement')));
const SupplierPurchaseOrderDetails = Loadable(
  lazy(() => import('../pages/SupplierPurchaseOrderDetails/SupplierPurchaseOrderDetails')),
);
const AnnouncementManagement = Loadable(
  lazy(() => import('../pages/AnnouncementManagement/AnnouncementManagement')),
);
const AnnouncementRegistration = Loadable(
  lazy(() => import('../pages/AnnouncementRegistration/AnnouncementRegistration')),
);
const ShipmentRegistration = Loadable(
  lazy(() => import('../pages/ShipmentRegistration/ShipmentRegistration')),
);
const PurchaseOrderRegistration = Loadable(
  lazy(() => import('../pages/PurchaseOrderRegistration/PurchaseOrderRegistration')),
);
const ProductList = Loadable(lazy(() => import('../pages/Product/ProductList')));
const ProductDetails = Loadable(lazy(() => import('../pages/ProductDetails/ProductDetails')));
const SearchCatalog = Loadable(lazy(() => import('../pages/SearchCatalog/SearchCatalog')));
const MyCart = Loadable(lazy(() => import('../pages/MyCart/MyCart')));
const CartDetails = Loadable(lazy(() => import('../pages/CartDetails/CartDetails')));

const ProjectRegistration = Loadable(
  lazy(() => import('../pages/ProjectRegistration/ProjectRegistration')),
);
const ProjectManagement = Loadable(
  lazy(() => import('../pages/ProjectManagement/ProjectManagement')),
);
const AllConfirmedPO = Loadable(lazy(() => import('../pages/AllConfirmedPO/AllConfirmedPO')));
const ApprovalPolicy = Loadable(lazy(() => import('../pages/Approval/ApprovalPolicy')));
const ApprovalPolicyManagement = Loadable(
  lazy(() => import('../pages/ApprovalPolicyManagement/ApprovalPolicyManagement')),
);
const GrnRecieptRegistration = Loadable(
  lazy(() => import('../pages/GrnRecieptRegistration/GrnRecieptRegistration')),
);

const CompanyInvoice = Loadable(lazy(() => import('../pages/CompanyInvoice/CompanyInvoice')));
const CompanyInvoiceDetails = Loadable(
  lazy(() => import('../pages/CompanyInvoiceDetails/CompanyInvoiceDetails')),
);
const CompanyCreateInvoice = Loadable(
  lazy(() => import('../pages/CompanyInvoice/CompanyCreateInvoice')),
);
const DepartmentManagement = Loadable(
  lazy(() => import('../pages/DepartmentManagement/DepartmentManagement')),
);
const DepartmentRegistration = Loadable(
  lazy(() => import('../pages/DepartmentRegistration/DepartmentRegistration')),
);

const ClassManagement = Loadable(lazy(() => import('../pages/ClassManagement/ClassManagement')));
const InternalItemManagement = Loadable(
  lazy(() => import('../pages/InternalItemManagement/InternalItemManagement')),
);
const SuppliersList = Loadable(
  lazy(() => import('../pages/Suppliers/SuppliersList')),
);
const SupplierDetail = Loadable(
  lazy(() => import('../pages/Suppliers/SupplierDetail')),
);
const ClassRegistration = Loadable(
  lazy(() => import('../pages/ClassRegistration/ClassRegistration')),
);
const LocationManagement = Loadable(
  lazy(() => import('../pages/LocationManagement/LocationManagement')),
);

const LocationRegistration = Loadable(
  lazy(() => import('../pages/LocationRegistration/LocationRegistration')),
);

const GLAccountManagement = Loadable(
  lazy(() => import('../pages/GLAccountManagement/GLAccountManagement')),
);

const GLAccountRegistration = Loadable(
  lazy(() => import('../pages/GLAccountRegistration/GLAccountRegistration')),
);

const CompanySettings = Loadable(lazy(() => import('../pages/CompanySettings/CompanySettings')));

const PurchaseOrderDetail = Loadable(
  lazy(() => import('../pages/PurchaseOrderDetail/PurchaseOrderDetail')),
);

const AddressManagement = Loadable(
  lazy(() => import('../pages/AddressManagement/AddressManagement')),
);

const AddressRegistration = Loadable(
  lazy(() => import('../pages/AddressRegistration/AddressRegistration')),
);

const CartApprovalDetail = Loadable(
  lazy(() => import('../pages/CartApprovalDetail/CartApprovalDetail')),
);

const ShippingMethodManagement = Loadable(
  lazy(() => import('../pages/ShippingMethodManagement/ShippingMethodManagement')),
);

const PaymentTerm = Loadable(lazy(() => import('../pages/PaymentTerm/PaymentTerm')));

const UserProfile = Loadable(lazy(() => import('../pages/UserProfile/UserProfile')));
const CompanyDetails = Loadable(lazy(() => import('../pages/CompanyDetails/CompanyDetails')));
const SupplierInfo = Loadable(lazy(() => import('../pages/SupplierInfo/SupplierInfo')));

const ResetPassword = Loadable(lazy(() => import('../pages/ResetPassword/Resetpassword')));
const EmailPo = Loadable(lazy(() => import('../pages/EmailPo/EmailPo')));
const Budget = Loadable(lazy(() => import('../pages/Budget/Budget')));
const BudgetDashboard = Loadable(lazy(() => import('../pages/BudgetDashboard/BudgetDashboard')));
const BudgetUtilization = Loadable(
  lazy(() => import('../pages/BudgetUtilization/BudgetUtilization')),
);
const CompanyDashboard = Loadable(lazy(() => import('../pages/CompanyDashboard/CompanyDashboard')));
const Report = Loadable(lazy(() => import('../pages/Report/Report')));
const EmailProviderManagement = Loadable(
  lazy(() => import('../pages/EmailProviderManagement/EmailProviderManagement')),
);
const EmailProvider = Loadable(lazy(() => import('../pages/EmailProvider/EmailProvider')));
const SupplierBuyerSideRegistration = Loadable(
  lazy(() => import('../pages/SupplierBuyerSide/SupplierBuyerSideRegistration')),
);

const Sequence = Loadable(lazy(() => import('../pages/Sequence/Sequence')));
const SequenceManagement = Loadable(
  lazy(() => import('../pages/SequenceManagement/SequenceManagement')),
);

const DynamicReportGenerate = Loadable(
  lazy(() => import('../pages/DynamicReportGenerate/DynamicReportGenerate')),
);
const DynamicReport = Loadable(lazy(() => import('../pages/DynamicReportGenerate/DynamicReport')));
const ExecutiveDashboard = Loadable(
  lazy(() => import('../pages/ExecutiveDashboard/ExecutiveDashboard')),
);

// Billing Pages
const BillingPlans = Loadable(lazy(() => import('../pages/Billing/BillingPlans')));
const BillingDashboard = Loadable(lazy(() => import('../pages/Billing/BillingDashboard')));
const BillingInvoices = Loadable(lazy(() => import('../pages/Billing/BillingInvoices')));
const AdminSubscriptionManagement = Loadable(
  lazy(() => import('../pages/Billing/AdminSubscriptionManagement')),
);
const AdminPlanList = Loadable(
  lazy(() => import('../pages/Billing/AdminPlanList')),
);
const AdminPlanView = Loadable(
  lazy(() => import('../pages/Billing/AdminPlanView')),
);
const AdminPlanForm = Loadable(
  lazy(() => import('../pages/Billing/AdminPlanForm')),
);
const AdminInvoiceManagement = Loadable(
  lazy(() => import('../pages/Billing/AdminInvoiceManagement')),
);
const AdminUsageManagement = Loadable(
  lazy(() => import('../pages/Billing/AdminUsageManagement')),
);

const AdminCompanyView = Loadable(
  lazy(() => import('../pages/CompanyManagement/AdminCompanyView')),
);

const AdminSupplierView = Loadable(
  lazy(() => import('../pages/SupplierManagement/AdminSupplierView')),
);

/***** Auth Pages ****/
const Error404 = Loadable(lazy(() => import('../pages/Error/Error')));

const RfqWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState([]);

  useEffect(() => {
    const roles = getUserRole();
    setUserRole(roles);
    setIsLoading(false);
  }, []);

  if (isLoading) return <Spinner />;

  // RECEIVER users should not access RFQ pages
  if (userRole.includes('RECEIVER') && !userRole.includes('BUYER') && !userRole.includes('COMPANY_ADMIN')) {
    return <Navigate to="/dashboard" replace />;
  }

  return userRole.includes('SUPPLIER_ADMIN') ? <RfqSupplierList /> : <RfqList />;
};

const VoucherWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState([]);

  useEffect(() => {
    const roles = getUserRole();
    setUserRole(roles);
    setIsLoading(false);
  }, []);

  if (isLoading) return <Spinner />;

  return userRole.includes('SUPPLIER_ADMIN') ? <SupplierVoucher /> : <Voucher />;
};

const BillWrapper = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState([]);

  useEffect(() => {
    const roles = getUserRole();
    setUserRole(roles);
    setIsLoading(false);
  }, []);

  if (isLoading) return <Spinner />;

  return userRole.includes('SUPPLIER_ADMIN') ? <SupplierBills /> : <Bills />;
};

/*****Routes******/

const ThemeRoutes = [
  {
    element: <BlankLayout />,
    children: [
      {
        path: '/',
        name: 'Home',
        element: <PublicRoute element={<Navigate to="/login" />} />,
      },
      {
        path: '/login',
        name: 'Login',
        exact: true,
        element: <PublicRoute element={<Login />} />,
      },
      {
        path: '/admin',
        name: 'AdminLogin',
        exact: true,
        element: <PublicRoute element={<AdminLogin />} />,
      },
      {
        path: '/register',
        name: 'Register',
        exact: true,
        element: <PublicRoute element={<Register />} />,
      },
      {
        path: '/verify-email',
        name: 'EmailVerification',
        exact: true,
        element: <PublicRoute element={<EmailVerification />} />,
      },
      {
        path: '/forgot-password',
        name: 'ForgotPassword',
        exact: true,
        element: <PublicRoute element={<ForgotPassword />} />,
      },
      {
        path: '/reset-password-token',
        name: 'ResetPasswordWithToken',
        exact: true,
        element: <PublicRoute element={<ResetPasswordWithToken />} />,
      },
      { path: '*', element: <Navigate to="/404" /> },
      { path: '404', element: <Error404 /> },
    ],
  },
  {
    element: <FullLayout />,
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<Dashboard />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE', 'RECEIVER']}
          />
        ),
      },
      {
        path: '/reset-password',
        name: 'ResetPassword',
        exact: true,
        element: (
          <PrivateRoute
            element={<ResetPassword />}
            allowedEntities={['COMPANY', 'SUPPLIER', 'ADMIN']}
            allowedRoles={['COMPANY_ADMIN', 'SUPPLIER_ADMIN', 'ADMIN', 'RECEIVER', 'ACCOUNT_PAYABLE','BUYER']}
          />
        ),
      },
      {
        path: '/company-management',
        name: 'Company Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyManagement />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/company-management/:companyId',
        name: 'Admin Company View',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminCompanyView />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/company-registration',
        name: 'Company Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyRegistration />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/subscription-management',
        name: 'adminSubscriptionManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminSubscriptionManagement />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/plan-management',
        name: 'adminPlanList',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminPlanList />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/plan-management/create',
        name: 'adminPlanCreate',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminPlanForm />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/plan-management/:planId',
        name: 'adminPlanView',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminPlanView />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/plan-management/:planId/edit',
        name: 'adminPlanEdit',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminPlanForm />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/invoice-management',
        name: 'adminInvoiceManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminInvoiceManagement />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/usage-management',
        name: 'adminUsageManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminUsageManagement />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/catalog-item',
        name: 'Catalog Item',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogItem />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/catalog-item-management',
        name: 'Catalog Item Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogItemManagement />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/company-registration/:companyId',
        name: 'Company Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyRegistration />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/supplier-registration',
        name: 'Supplier Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierRegistration />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },

      {
        path: '/supplier-registration/:supplierId',
        name: 'Supplier Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierRegistration />}
            allowedEntities={['ADMIN', 'SUPPLIER']}
            allowedRoles={['ADMIN', 'SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/catalog-item/:CatalogItemId',
        name: 'Catalog Item',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogItem />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/catalog-management',
        name: 'Catalog Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogManagement />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/catalog-registration',
        name: 'Catalog Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogRegistration />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/create-invoice',
        name: 'Create Invoice',
        exact: true,
        element: (
          <PrivateRoute
            element={<CreateInvoice />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/catalog-registration/:catalogId',
        name: 'Catalog Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<CatalogRegistration />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/user-registration',
        name: 'User Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserRegistration />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ADMIN']}
          />
        ),
      },
      {
        path: '/user-registration/:companyId',
        name: 'User Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserRegistration />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ADMIN']}
          />
        ),
      },
      {
        path: '/user-registration/:userId/:companyId',
        name: 'User Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserRegistration />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ADMIN']}
          />
        ),
      },
      {
        path: '/user-registration/:userId/:companyId/:userEntityType',
        name: 'User Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserRegistration />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ADMIN']}
          />
        ),
      },
      {
        path: '/carts',
        name: 'Carts',
        exact: true,
        element: (
          <PrivateRoute
            element={<GetAllCart />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/supplier-dashboard',
        name: 'Dashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierDashboard />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/supplier-management',
        name: 'Supplier Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierManagement />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/supplier-management/:supplierId',
        name: 'Admin Supplier View',
        exact: true,
        element: (
          <PrivateRoute
            element={<AdminSupplierView />}
            allowedEntities={['ADMIN']}
            allowedRoles={['ADMIN']}
          />
        ),
      },
      {
        path: '/user-management',
        name: 'User Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserManagement />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['ADMIN', 'COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/user-details/:userId/:companyId/:userEntityType',
        name: 'User Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserDetails />}
            allowedEntities={['ADMIN', 'COMPANY']}
            allowedRoles={['ADMIN', 'COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/purchase-order',
        name: 'Purchase Order',
        exact: true,
        element: (
          <PrivateRoute
            element={<PurchaseOrder />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      // {

      //   path: '/purchase-order/:purchaseOrderId',
      //   name: 'Purchase Order',
      //   exact: true,
      //   element: <PurchaseOrder />,
      // },
      {
        path: '/shipment',
        name: 'Shipment',
        exact: true,
        element: (
          <PrivateRoute
            element={<Shipment />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/Rfq',
        name: 'RFQ',
        exact: true,
        element: (
          <PrivateRoute
            element={<RfqWrapper />}
            allowedEntities={['COMPANY', 'SUPPLIER']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/SupplierBuyerSideRegistration',
        name: 'SupplierBuyerSideRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierBuyerSideRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/supplier-details/:supplierId',
        name: 'Supplier Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierBuyerSideRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/CreateRfq',
        name: 'RFQ',
        exact: true,
        element: (
          <PrivateRoute
            element={<CreateRfq />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/CreateRfq/:rfqId',
        name: 'RFQ',
        exact: true,
        element: (
          <PrivateRoute
            element={<CreateRfq />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/report',
        name: 'Report',
        exact: true,
        element: (
          <PrivateRoute
            element={<Report />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/RfqApprovalDetails/:rfqId',
        name: 'RFQ Approval Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<RfqApprovalDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE', 'RECEIVER']}
          />
        ),
      },
      {
        path: '/RfqDetails/:rfqId',
        name: 'Rfq Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<RfqDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/RfqDetails/:companyId/:rfqId',
        name: 'Rfq Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<RfqSupplierDetails />}
            allowedEntities={['COMPANY', 'SUPPLIER']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/email-provider',
        name: 'Email Provider',
        exact: true,
        element: (
          <PrivateRoute
            element={<EmailProvider />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/email-provider/:id',
        name: 'Email Provider',
        exact: true,
        element: (
          <PrivateRoute
            element={<EmailProvider />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/Email-Provider-Management',
        name: 'Email Provider Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<EmailProviderManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/qualitycheck',
        name: 'QualityCheck',
        exact: true,
        element: (
          <PrivateRoute
            element={<QualityCheck />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'RECEIVER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/invoice',
        name: 'Invoice',
        exact: true,
        element: (
          <PrivateRoute
            element={<Invoice />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/invoices',
        name: 'Invoices',
        exact: true,
        element: (
          <PrivateRoute
            element={<Invoices />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/supplier-invoice-details/:invoiceId',
        name: 'supplierInvoiceDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierInvoiceDetails />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/supplier-purchase-order-details/:purchaseOrderId',
        name: 'supplierPurchaseOrderDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierPurchaseOrderDetails />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/invoice/:purchaseOrderId',
        name: 'Invoice',
        exact: true,
        element: (
          <PrivateRoute
            element={<Invoice />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/grn-receipt',
        name: 'GrnReceipt',
        exact: true,
        element: (
          <PrivateRoute
            element={<GrnReceipt />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'RECEIVER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/grn-details/:grnId',
        name: 'GrnDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<GrnDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'RECEIVER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/receipt',
        name: 'Receipt',
        exact: true,
        element: (
          <PrivateRoute
            element={<Receipt />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/receipt/:grnId',
        name: 'Receipt',
        exact: true,
        element: (
          <PrivateRoute
            element={<Receipt />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/bill',
        name: 'Bill',
        exact: true,
        element: (
          <PrivateRoute
            element={<BillWrapper />}
            allowedEntities={['SUPPLIER', 'COMPANY']}
            allowedRoles={['SUPPLIER_ADMIN', 'COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/voucher',
        name: 'Voucher',
        exact: true,
        element: (
          <PrivateRoute
            element={<VoucherWrapper />}
            allowedEntities={['COMPANY', 'SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN', 'COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/bills',
        name: 'Bills',
        exact: true,
        element: (
          <PrivateRoute
            element={<Bills/>}
            allowedEntities={['COMPANY', 'SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN', 'COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/voucher-detail/:voucherHeadId',
        name: 'VoucherDetail',
        exact: true,
        element: (
          <PrivateRoute
            element={<VoucherDetails />}
            allowedEntities={['SUPPLIER', 'COMPANY']}
            allowedRoles={['SUPPLIER_ADMIN', 'COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/create-voucher',
        name: 'VoucherDetail',
        exact: true,
        element: (
          <PrivateRoute
            element={<CreateVoucher />}
            allowedEntities={['SUPPLIER', 'COMPANY']}
            allowedRoles={['SUPPLIER_ADMIN', 'COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/budget',
        name: 'budget',
        exact: true,
        element: (
          <PrivateRoute
            element={<Budget />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/budget-dashboard',
        name: 'Budget Dashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<BudgetDashboard />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE', 'BUYER']}
          />
        ),
      },
      {
        path: '/budget-utilization/:budgetId',
        name: 'Budget Utilization',
        exact: true,
        element: (
          <PrivateRoute
            element={<BudgetUtilization />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE', 'BUYER']}
          />
        ),
      },
      {
        path: '/company-dashboard',
        name: 'Company Dashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyDashboard />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE', 'BUYER']}
          />
        ),
      },
      {
        path: '/executive-dashboard',
        name: 'Executive Dashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<ExecutiveDashboard />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/feedback-management',
        name: 'Feedback Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<FeedbackManagement />}
            allowedEntities={['COMPANY', 'SUPPLIER']}
            allowedRoles={['COMPANY_ADMIN', 'SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/announcement-management',
        name: 'Announcement Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<AnnouncementManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/announcement-registration',
        name: 'Announcement Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<AnnouncementRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/announcement-registration/:announcementId',
        name: 'Announcement Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<AnnouncementRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/shipment-registration',
        name: 'Shipment Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ShipmentRegistration />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/shipment-registration/:shipmentId',
        name: 'Shipment Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ShipmentRegistration />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/purchase-order-registration',
        name: 'Purchase Order Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<PurchaseOrderRegistration />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },
      {
        path: '/project-registration',
        name: 'Project Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProjectRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/project-registration/:projectId',
        name: 'Project Registration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProjectRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/project-management',
        name: 'Project Management',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProjectManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/search-catalog',
        name: 'searchCatalog',
        exact: true,
        element: (
          <PrivateRoute
            element={<SearchCatalog />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/products',
        name: 'products',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProductList />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/products/:cartId',
        name: 'products',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProductList />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/products/:companyId/:cartId',
        name: 'products',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProductList />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/products/:companyId/:cartId/:shipToAddressId',
        name: 'products',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProductList />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/product-detail/:CatalogItemId',
        name: 'product details',
        exact: true,
        element: (
          <PrivateRoute
            element={<ProductDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/mycart',
        name: 'mycart',
        exact: true,
        element: (
          <PrivateRoute
            element={<MyCart />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/EmailPo',
        name: 'EmailPo',
        exact: true,
        element: (
          <PrivateRoute
            element={<EmailPo />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/Sequence',
        name: 'Sequence',
        exact: true,
        element: (
          <PrivateRoute
            element={<Sequence />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/edit-sequence/:sequenceId',
        name: 'EditSequence',
        exact: true,
        element: (
          <PrivateRoute
            element={<Sequence />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/SequenceManagement',
        name: 'SequenceManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<SequenceManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },
      {
        path: '/cartDetails',
        name: 'Cart Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<CartDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/cartDetails/:cartId',
        name: 'Cart Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<CartDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/cartDetails/:cartId/:shipToAddressId',
        name: 'Cart Details',
        exact: true,
        element: (
          <PrivateRoute
            element={<CartDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/allconfirmedpo',
        name: 'allconfirmedpo',
        exact: true,
        element: (
          <PrivateRoute
            element={<AllConfirmedPO />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/approval-policy-management',
        name: 'approvalpolicymanagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<ApprovalPolicyManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },

      {
        path: '/approval',
        name: 'approval',
        exact: true,
        element: (
          <PrivateRoute
            element={<ApprovalPolicy />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },

      {
        path: '/grn-receipt-registration',
        name: 'grnRecieptRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<GrnRecieptRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/grn-receipt-registration/:invoiceId',
        name: 'grnRecieptRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<GrnRecieptRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/company-invoices',
        name: 'companyInvoices',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyInvoice />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/company-invoice-details/:invoiceId',
        name: 'companyInvoiceDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyInvoiceDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/company-create-invoice',
        name: 'companyCreateInvoice',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyCreateInvoice />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/department-management',
        name: 'departmentManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<DepartmentManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/department-registration',
        name: 'departmentRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<DepartmentRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/department-registration/:departmentId',
        name: 'departmentRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<DepartmentRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/class-management',
        name: 'classManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<ClassManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/class-registration',
        name: 'classRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ClassRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/class-registration/:classId',
        name: 'classRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<ClassRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/internal-item-management',
        name: 'internalItemManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<InternalItemManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/suppliers',
        name: 'suppliersList',
        exact: true,
        element: (
          <PrivateRoute
            element={<SuppliersList />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/suppliers/:supplierId',
        name: 'supplierDetail',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierDetail />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/location-management',
        name: 'locationManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<LocationManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/location-registration',
        name: 'locationRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<LocationRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/location-registration/:locationId',
        name: 'locationRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<LocationRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/gl-account-management',
        name: 'glAccountManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<GLAccountManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/gl-account-registration',
        name: 'glAccountRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<GLAccountRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/gl-account-registration/:glAccountId',
        name: 'glAccountRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<GLAccountRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/company-settings',
        name: 'companySettings',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanySettings />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN']}
          />
        ),
      },

      {
        path: '/purchase-order-detail/:purchaseOrderId',
        name: 'purchaseOrderDetail',
        exact: true,
        element: (
          <PrivateRoute
            element={<PurchaseOrderDetail />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE', 'RECEIVER']}
          />
        ),
      },

      {
        path: '/address-management',
        name: 'addressManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<AddressManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/address-registration',
        name: 'addressRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<AddressRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },
      {
        path: '/address-registration/:addressId',
        name: 'addressRegistration',
        exact: true,
        element: (
          <PrivateRoute
            element={<AddressRegistration />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/cart-approval-details/:cartId',
        name: 'cartApprovalDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<CartApprovalDetail />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER', 'ACCOUNT_PAYABLE', 'RECEIVER']}
          />
        ),
      },

      {
        path: '/shipping-method-management',
        name: 'shippingMethodManagement',
        exact: true,
        element: (
          <PrivateRoute
            element={<ShippingMethodManagement />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/payment-term',
        name: 'paymentTerm',
        exact: true,
        element: (
          <PrivateRoute
            element={<PaymentTerm />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },

      {
        path: '/dynamic-report-generate',
        name: 'dynamicReportGenerate',
        exact: true,
        element: (
          <PrivateRoute
            element={<DynamicReportGenerate />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/dynamic-report',
        name: 'dynamicReport',
        exact: true,
        element: (
          <PrivateRoute
            element={<DynamicReport />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'BUYER']}
          />
        ),
      },
      {
        path: '/supplier-info',
        name: 'supplierInfo',
        exact: true,
        element: (
          <PrivateRoute
            element={<SupplierInfo />}
            allowedEntities={['SUPPLIER']}
            allowedRoles={['SUPPLIER_ADMIN']}
          />
        ),
      },

      {
        path: '/user-profile',
        name: 'userProfile',
        exact: true,
        element: (
          <PrivateRoute
            element={<UserProfile />}
            allowedEntities={['COMPANY', 'ADMIN', 'SUPPLIER']}
            allowedRoles={[
              'COMPANY_ADMIN',
              'BUYER',
              'ADMIN',
              'SUPPLIER_ADMIN',
              'ACCOUNT_PAYABLE',
              'RECEIVER',
            ]}
          />
        ),
      },

      {
        path: '/company-details',
        name: 'companyDetails',
        exact: true,
        element: (
          <PrivateRoute
            element={<CompanyDetails />}
            allowedEntities={['COMPANY']}
            allowedRoles={[
              'COMPANY_ADMIN',
              'BUYER',
              'ACCOUNT_PAYABLE',
              'RECEIVER',
            ]}
          />
        ),
      },

      // Billing Routes
      {
        path: '/billing-plans',
        name: 'billingPlans',
        exact: true,
        element: (
          <PrivateRoute
            element={<BillingPlans />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/billing-dashboard',
        name: 'billingDashboard',
        exact: true,
        element: (
          <PrivateRoute
            element={<BillingDashboard />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      {
        path: '/billing-invoices',
        name: 'billingInvoices',
        exact: true,
        element: (
          <PrivateRoute
            element={<BillingInvoices />}
            allowedEntities={['COMPANY']}
            allowedRoles={['COMPANY_ADMIN', 'ACCOUNT_PAYABLE']}
          />
        ),
      },

      { path: '*', element: <Navigate to="/404" /> },
      { path: '404', element: <Error404 /> },
    ],
  },
];
export default ThemeRoutes;
