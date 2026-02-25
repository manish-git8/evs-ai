import React from 'react';
import Swal from 'sweetalert2';
import PropTypes from 'prop-types';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import CompanyService from '../../../services/CompanyService';
import 'react-toastify/dist/ReactToastify.css';

const Step4 = ({ getStore, jumpToStep }) => {
  const state = getStore();
  const { companyId } = useParams();
  const navigate = useNavigate();
  const handleSave = () => {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit the data?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel',
    }).then((result) => {
      if (result.isConfirmed) {
        const {
          billingAddress,
          shippingAddresses,
          primaryContact,
          secondaryContact,
          fax,
          name,
          displayName,
          email,
          website,
          phone,
          categoryId,
          subCategoryId,
        } = state;

        const resolvedCompanyId =
          companyId ||
          (billingAddress && billingAddress.companyId) ||
          (primaryContact && primaryContact.entityId) ||
          1;
        const billing = {
          ...(billingAddress || {}),
          companyId: resolvedCompanyId,
          ...(billingAddress && billingAddress.addressId && { addressId: billingAddress.addressId }),
        };
        const shippings = (
          shippingAddresses && shippingAddresses.length > 0 ? shippingAddresses : [{}]
        ).map((ship, idx) => ({
          ...(ship || {}),
          companyId: resolvedCompanyId,
          ...(ship && ship.addressId && { addressId: ship.addressId }),
        }));
        const contactFormatter = (contact, fallbackRoleId, roleName) => {
          if (!contact) return undefined;
          return {
            ...contact,
            ...(contact.userId && { userId: contact.userId }),
            entityId: resolvedCompanyId,
            entityType: 'COMPANY',
            address: {
              ...(contact.address || {}),
              companyId: resolvedCompanyId,
              ...(contact.address && contact.address.addressId && { addressId: contact.address.addressId }),
            },
            role:
              contact.role && contact.role.length > 0
                ? contact.role.map((r) => ({
                    ...r,
                    ...(r.roleId && { roleId: r.roleId }),
                    name: r.name || roleName,
                  }))
                : [{ roleId: fallbackRoleId, name: roleName, isActive: true }],
          };
        };

        const primary = contactFormatter(primaryContact, 2, 'Admin');
        const secondary = secondaryContact ? {
          ...contactFormatter(secondaryContact, 3, 'Manager'),
          userId: secondaryContact.userId || primaryContact?.userId,
        } : undefined;
        const hasSecondaryContact =
          secondaryContact &&
          ((secondaryContact.firstName || '').trim() !== '' ||
            (secondaryContact.lastName || '').trim() !== '');

        const requestBody = {
          ...(companyId && { companyId }),
          billingAddress: billing,
          shippingAddresses: shippings,
          primaryContact: primary,
          ...(hasSecondaryContact && { secondaryContact: secondary }),
          fax: fax || '',
          name: name || '',
          displayName: displayName || '',
          email: email || '',
          website: website || '',
          categoryId: categoryId || '',
          subCategoryId: subCategoryId || '',
          phone: phone || '',
        };
        const apiCall = companyId
          ? CompanyService.handleUpdateCompany(requestBody, companyId)
          : CompanyService.handleCreateCompany(requestBody);

        apiCall
          .then((response) => {
            if (response.status === 200 || response.status === 201) {
              toast.dismiss();
              if (companyId) {
                toast.success('Company updated successfully!');
              } else {
                toast.success('Company created successfully!');
              }
              setTimeout(() => {
                navigate('/company-management');
              }, 2000);
            }
            jumpToStep(4);
          })
          .catch((error) => {
            console.error('Error saving company:', error);

            // Don't show toast for 400 errors - apiClient interceptor already handles them
            const status = error.response?.status || error.status;
            if (status === 400) {
              return; // Interceptor already showed the toast
            }

            toast.dismiss();

            const errorMessage = error.response?.data?.errorMessage ||
                                error.response?.data?.message ||
                                error.message ||
                                'An unexpected error occurred';

            toast.error(errorMessage);
          });
      }
    });
  };

  const { savedToCloud } = state;

  const handlePrevious = () => {
    jumpToStep(2);
  };

  return (
    <div className="step step4 mt-5">
      <div className="row justify-content-md-center">
        <div className="col-lg-8">
          <form id="Form" className="form-horizontal">
            <div className="form-group text-center">
              <div className="col-md-12">
                <h1 className="display-4 text-success">Thank You!</h1>
                <h2 className="mb-4">Submit Your Data</h2>
                <p className="lead mb-4">
                  We appreciate your time and effort. Please review your data before submitting.
                </p>

                <div className="d-flex justify-content-center gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-lg"
                    onClick={handlePrevious}
                  >
                    <i className="bi bi-arrow-left me-2"></i>Previous
                  </button>

                  {savedToCloud ? (
                    <div className="alert alert-success mt-3" role="alert">
                      <h4 className="alert-heading">Success!</h4>
                      <p>Your data has been successfully saved to the cloud.</p>
                      <hr />
                      <p className="mb-0">You can now proceed to the next steps.</p>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-primary btn-lg" onClick={handleSave}>
                      <i className="bi bi-cloud-upload me-2"></i>Submit
                    </button>
                  )}
                </div>

                {!savedToCloud && (
                  <p className="text-muted mt-3">
                    By clicking Submit you agree to save your data securely to the cloud.
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
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
    </div>
  );
};

Step4.propTypes = {
  getStore: PropTypes.func.isRequired,
  jumpToStep: PropTypes.func.isRequired,
};

export default Step4;
