import React, { useState, useEffect } from 'react';
import { DropdownItem, Collapse } from 'reactstrap';
import { User, Settings, Users, FileText, CheckCircle, MapPin, List, ChevronDown, ChevronUp, MessageSquare, Briefcase } from 'react-feather';
import { TbInfoSquare } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';
import { RiLockPasswordFill } from 'react-icons/ri';
import {
  getUserEmail,
  getUserName,
  getEntityType,
  getUserRole,
  getCompanyName,
} from '../../pages/localStorageUtil';
import user1 from '../../assets/images/users/user4.jpg';

const ProfileDD = () => {
  const navigate = useNavigate();
  const userName = getUserName();
  const userEmail = getUserEmail();
  const companyName = getCompanyName();
  const [profileImage, setProfileImage] = useState(localStorage.getItem('profileImageBase64'));
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handleProfileImageUpdate = () => {
      setProfileImage(localStorage.getItem('profileImageBase64'));
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  const entityType = getEntityType();
  const userRoles = getUserRole() || [];

  const isSupplierUser = entityType === 'SUPPLIER' && userRoles.includes('SUPPLIER_ADMIN');
  const isCompanyUser = entityType === 'COMPANY';
  const isCompanyAdmin = entityType === 'COMPANY' && userRoles.includes('COMPANY_ADMIN');

  const settingsItems = [
    { icon: Users, label: 'User Management', path: '/user-management' },
    { icon: FileText, label: 'Announcement', path: '/announcement-management' },
    { icon: CheckCircle, label: 'Approval Policy', path: '/approval-policy-management' },
    { icon: Settings, label: 'Company Settings', path: '/company-settings' },
    { icon: MapPin, label: 'Address', path: '/address-management' },
    { icon: List, label: 'Sequence Management', path: '/SequenceManagement' },
  ];

  return (
    <div>
      <div className="d-flex gap-3 p-3 border-bottom pt-2 align-items-center">
        <img
          src={profileImage || user1}
          alt="user"
          className="rounded-circle"
          width="60"
          height="60"
          style={{ objectFit: 'cover', borderRadius: '50%' }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h5 className="mb-0">{userName}</h5>
          <small
            className="fs-6 text-muted"
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={userEmail}
          >
            {userEmail}
          </small>
          {isCompanyUser && companyName && (
            <div
              className="mt-1 d-flex align-items-center"
              style={{
                backgroundColor: '#e3f2fd',
                borderRadius: '4px',
                padding: '3px 8px',
                maxWidth: 'fit-content',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onClick={() => navigate('/company-details')}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#bbdefb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#e3f2fd'; }}
              title="View Company Details"
            >
              <Briefcase size={12} style={{ color: '#1976d2', marginRight: '5px' }} />
              <small
                style={{
                  color: '#1976d2',
                  fontWeight: '600',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '150px',
                  textDecoration: 'underline',
                }}
              >
                {companyName}
              </small>
            </div>
          )}
        </div>
      </div>
      {isSupplierUser && (
        <DropdownItem className="px-4 py-3" onClick={() => navigate('/supplier-info')}>
          <TbInfoSquare size={20} /> &nbsp; Company Profile
        </DropdownItem>
      )}
      <DropdownItem className="px-4 py-3" onClick={() => navigate('/user-profile')}>
        <User size={20} /> &nbsp; My Profile
      </DropdownItem>
      {isCompanyUser && (
        <DropdownItem className="px-4 py-3" onClick={() => navigate('/company-details')}>
          <Briefcase size={20} /> &nbsp; Company Details
        </DropdownItem>
      )}

      {/* Settings Menu for Company Admin */}
      {isCompanyAdmin && (
        <>
          <DropdownItem
            className="px-4 py-3 d-flex align-items-center justify-content-between"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(!settingsOpen);
            }}
            toggle={false}
            style={{ cursor: 'pointer' }}
          >
            <span>
              <Settings size={20} /> &nbsp; Settings
            </span>
            {settingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </DropdownItem>
          <Collapse isOpen={settingsOpen}>
            <div style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #e9ecef', borderBottom: '1px solid #e9ecef' }}>
              {settingsItems.map((item) => (
                <DropdownItem
                  key={item.path}
                  className="py-2"
                  style={{ paddingLeft: '3rem', fontSize: '13px' }}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={16} style={{ color: '#666' }} /> &nbsp; {item.label}
                </DropdownItem>
              ))}
            </div>
          </Collapse>
          <DropdownItem className="px-4 py-3" onClick={() => navigate('/feedback-management')}>
            <MessageSquare size={20} /> &nbsp; Feedback
          </DropdownItem>
        </>
      )}

      <DropdownItem className="px-4 py-3" onClick={() => navigate('/reset-password')}>
        <RiLockPasswordFill size={20} /> &nbsp; Reset Password
      </DropdownItem>
      <DropdownItem divider />
    </div>
  );
};

export default ProfileDD;
