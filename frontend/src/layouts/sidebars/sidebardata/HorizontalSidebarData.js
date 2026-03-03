import * as Icon from 'react-feather';
import { LuReceiptText } from 'react-icons/lu';
import { LiaFileInvoiceSolid } from 'react-icons/lia';
// import { SiAmazonsimpleemailservice } from 'react-icons/si';
import { CiViewTimeline } from 'react-icons/ci';
import {
  MdOutlineManageAccounts,
  MdOutlineFolder,
  MdOutlineBusiness,
  MdOutlineLocationOn,
  MdOutlineRequestQuote,
  MdOutlineAccountBalance,
  MdOutlineClass,
  MdOutlineCheckCircle,
  // MdOutlineSettings,
  MdOutlineFeedback,
  // MdOutlineEmail,
  MdOutlineReceipt,
} from 'react-icons/md';
import { FiUsers } from 'react-icons/fi';
import { FaRegAddressBook, FaTruckArrowRight } from 'react-icons/fa6';
import { GrCatalog, GrCatalogOption } from 'react-icons/gr';
import { TfiAnnouncement } from 'react-icons/tfi';
import { BsCurrencyDollar } from 'react-icons/bs';
import { TbReportAnalytics } from 'react-icons/tb';

const SidebarData = [
  { caption: 'Home' },
  {
    title: 'Dashboard',
    href: '/dashboard',
    id: 1,
    suffixColor: 'bg-info',
    icon: <Icon.Home />,
    collapisble: true,
  },
  {
    title: 'Dashboard',
    href: '/supplier-dashboard',
    id: 1,
    suffixColor: 'bg-info',
    icon: <Icon.Home />,
    collapisble: true,
  },
  {
    title: 'Invoices',
    href: '/invoices',
    id: 1,
    suffixColor: 'bg-info',
    icon: <LiaFileInvoiceSolid />,
    collapisble: true,
  },
  { caption: 'Admin' },
  {
    title: 'Admin',
    href: '/apps',
    id: 2,
    icon: <Icon.UserPlus />,
    ddType: 'two-column',
    collapisble: true,
    children: [
      {
        title: 'Company Management',
        href: '/company-management',
        icon: <Icon.Copy />,
      },
      {
        title: 'User Management',
        href: '/user-management',
        icon: <FiUsers size="17" />,
      },
      {
        title: 'Announcement',
        href: '/announcement-management',
        icon: <TfiAnnouncement size="17" />,
      },
      {
        title: 'Approval Policy',
        href: '/approval-policy-management',
        icon: <MdOutlineCheckCircle size="17" />,
      },
      {
        title: 'Company Settings',
        href: '/company-settings',
        icon: <Icon.Settings />,
      },
      {
        title: 'Address',
        href: '/address-management',
        icon: <FaRegAddressBook size="17" />,
      },
      {
        title: 'Sequence Management',
        href: '/SequenceManagement',
        icon: <CiViewTimeline size="19" />,
      },
      {
        title: 'Subscription Management',
        href: '/subscription-management',
        icon: <Icon.CreditCard />,
        allowedEntities: ['ADMIN'],
        allowedRoles: ['ADMIN'],
      },
      {
        title: 'Plan Management',
        href: '/plan-management',
        icon: <Icon.Package />,
        allowedEntities: ['ADMIN'],
        allowedRoles: ['ADMIN'],
      },
      {
        title: 'Invoice Management',
        href: '/invoice-management',
        icon: <Icon.FileText />,
        allowedEntities: ['ADMIN'],
        allowedRoles: ['ADMIN'],
      },
    ],
  },
  { caption: 'Supplier' },
  {
    title: 'Supplier',
    href: '/apps',
    id: 3,
    icon: <Icon.UserPlus />,
    ddType: 'two-column',
    collapisble: true,
    children: [
      {
        title: 'Supplier Management',
        href: '/supplier-management',
        icon: <Icon.Copy />,
      },
    ],
  },

  { caption: 'Catalog' },
  {
    title: 'Catalog',
    href: '/apps',
    id: 5,
    icon: <Icon.UserPlus />,
    ddType: 'two-column',
    collapisble: true,
    children: [
      {
        title: 'Catalog Management',
        href: '/catalog-management',
        icon: <GrCatalog size="22" />,
      },
      {
        title: 'Catalog Item Management',
        href: '/catalog-item-management',
        icon: <GrCatalogOption size="22" />,
      },
      // {
      //   title: 'Purchase Order ',
      //   href: '/purchase-order',
      //   icon: <BiPurchaseTag size="22" />,
      // },
      {
        title: 'Shipment ',
        href: '/shipment',
        icon: <FaTruckArrowRight size="22" />,
      },
    ],
  },
  { caption: 'Accounts Management' },
  {
    title: 'Accounts Management',
    href: '/apps',
    id: 6,
    icon: <MdOutlineManageAccounts size={22} />,
    ddType: 'two-column',
    collapisble: true,
    children: [
      {
        title: 'Project',
        href: '/project-management',
        icon: <MdOutlineFolder size="20" />,
      },
      {
        title: 'Department',
        href: '/department-management',
        icon: <MdOutlineBusiness size="19" />,
      },
      {
        title: 'Location',
        href: '/location-management',
        icon: <MdOutlineLocationOn size="20" />,
      },
      {
        title: 'GLAccount',
        href: '/gl-account-management',
        icon: <MdOutlineAccountBalance size="19" />,
      },
      {
        title: 'Budget Configuration',
        href: '/budget',
        icon: <BsCurrencyDollar size={19} />,
      },
      {
        title: 'Budget Dashboard',
        href: '/budget-dashboard',
        icon: <TbReportAnalytics size={19} />,
      },

      {
        title: 'Class',
        href: '/class-management',
        icon: <MdOutlineClass size="20" />,
      },
      {
        title: 'Billing Dashboard',
        href: '/billing-dashboard',
        icon: <Icon.CreditCard size="20" />,
      },
      {
        title: 'Subscription Plans',
        href: '/billing-plans',
        icon: <Icon.Package size="20" />,
        allowedEntities: ['ADMIN'],
        allowedRoles: ['ADMIN'],
      },
      {
        title: 'Billing Invoices',
        href: '/billing-invoices',
        icon: <Icon.FileText size="20" />,
      },
    ],
  },
  { caption: 'Accounts' },
  {
    title: 'Accounts',
    href: '/apps',
    id: 7,
    icon: <MdOutlineManageAccounts size={22} />,
    ddType: 'two-column',
    collapisble: true,
    children: [
      {
        title: 'Invoices',
        href: '/company-invoices',
        icon: <LiaFileInvoiceSolid size="19" />,
        allowedRoles: ['COMPANY_ADMIN'],
      },
      {
        title: 'Voucher',
        href: '/voucher',
        icon: <MdOutlineReceipt size="19" />,
      },
      {
        title: 'Bill',
        href: '/bill',
        icon: <Icon.FileText size="19" />,
      },
    ],
  },
  { caption: 'Feedback' },
  {
    title: 'Feedback',
    href: '/feedback-management',
    id: 9,
    icon: <MdOutlineFeedback size="22" />,
    collapisble: true,
  },
  { caption: 'Grn Receipt' },
  {
    title: 'GRN Receipt',
    href: '/grn-receipt',
    id: 4,
    icon: <LuReceiptText size={22} />,
    ddType: 'two-column',
    collapisble: true,
  },
  { caption: 'RFQ', excludeRoles: ['RECEIVER'] },
  {
    title: 'RFQ',
    href: '/Rfq',
    id: 8,
    icon: <MdOutlineRequestQuote size="22" />,
    ddType: 'two-column',
    collapisble: true,
    excludeRoles: ['RECEIVER'],
  },
  { caption: 'Internal Catalog' },
  {
    title: 'Internal Catalog',
    href: '/internal-item-management',
    id: 12,
    icon: <Icon.Package size="22" />,
    collapisble: true,
  },
  { caption: 'Suppliers' },
  {
    title: 'Suppliers',
    href: '/suppliers',
    id: 13,
    icon: <Icon.Truck size="22" />,
    collapisble: true,
  },
  // {
  //   title: 'Voucher',
  //   href: '/voucher',
  //   icon: <MdOutlineReceipt size="19" />,
  // },
  { caption: 'Executive Dashboard' },
  {
    title: 'Executive Dashboard',
    href: '/executive-dashboard',
    icon: <Icon.TrendingUp size={19} />,
    id: 10,
    ddType: 'two-column',
    collapisble: true,
  },

  // { caption: 'Report' },
  // {
  //   title: 'Report',
  //   href: '/report',
  //   id: 10,
  //   icon: <TbReportAnalytics size="22" />,
  //   ddType: 'two-column',
  //   collapisble: true,
  // },
];

export default SidebarData;
