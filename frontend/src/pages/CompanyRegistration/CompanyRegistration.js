import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import BreadCrumbs from '../../layouts/breadcrumbs/BreadCrumbs';
import ComponentCardSteps from '../../components/ComponentCardSteps';
import Step1 from './CompanyRegistrationSteps/Step1';
import Step2 from './CompanyRegistrationSteps/Step2';
import Step3 from './CompanyRegistrationSteps/Step3';
import Step4 from './CompanyRegistrationSteps/Step4';

const CompanyRegistration = () => {
  const { companyId } = useParams();
  const [sampleStore, setSampleStore] = useState({
    savedToCloud: false,
    email: '',
    name: '',
    displayName: '',
    fax: '',
    website: '',
    phone: '',
    categoryId: '',
    subCategoryId: '',
    currency: 'INR',
    primaryContact: {},
    secondaryContact: {},
    billingAddress: {},
    shippingAddresses: [],
  });

  const getStore = () => sampleStore;
  const [addressData, setAddressData] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  const jumpToStep = (step, data) => {
    setCurrentStep(step);
    if (data) {
      setAddressData(data);
    }
  };

  const deepMergePreserveIds = (oldObj, newObj) => {
    if (Array.isArray(newObj)) {
      return newObj.map((item, idx) => {
        const oldItem = oldObj && oldObj[idx] ? oldObj[idx] : {};
        return deepMergePreserveIds(oldItem, item);
      });
    }
    if (typeof newObj === 'object' && newObj !== null) {
      const result = {};
      // First, copy all properties from newObj
      Object.keys(newObj).forEach((key) => {
        if (typeof newObj[key] === 'object' && newObj[key] !== null && oldObj) {
          result[key] = deepMergePreserveIds(oldObj[key], newObj[key]);
        } else {
          result[key] = newObj[key];
        }
      });
      // Then, preserve old IDs only if they exist in oldObj AND are keys in newObj with empty/null values
      Object.keys(newObj).forEach((key) => {
        if (
          key.endsWith('Id') &&
          (newObj[key] === null || newObj[key] === '' || newObj[key] === 0) &&
          oldObj && oldObj[key] !== undefined && oldObj[key] !== null && oldObj[key] !== '' && oldObj[key] !== 0
        ) {
          // Only preserve old ID if new value is explicitly null/empty AND old ID has a valid value
          result[key] = oldObj[key];
        }
      });
      return result;
    }
    return newObj;
  };

  const updateStore = (update) => {
    setSampleStore((prevState) => {
      const billingAddress = 'billingAddress' in update
        ? deepMergePreserveIds(prevState.billingAddress, update.billingAddress)
        : prevState.billingAddress;
      const shippingAddresses = 'shippingAddresses' in update
        ? (update.shippingAddresses || []).map((newAddr, i) =>
            deepMergePreserveIds((prevState.shippingAddresses && prevState.shippingAddresses[i]) || {}, newAddr)
          )
        : prevState.shippingAddresses;
      const primaryContact = 'primaryContact' in update
        ? deepMergePreserveIds(prevState.primaryContact, update.primaryContact)
        : prevState.primaryContact;
      const secondaryContact = 'secondaryContact' in update
        ? deepMergePreserveIds(prevState.secondaryContact, update.secondaryContact)
        : prevState.secondaryContact;
      const newState = {
        ...prevState,
        ...update,
        billingAddress,
        shippingAddresses,
        primaryContact,
        secondaryContact,
        selectedBillingStateId: update.selectedBillingStateId || prevState.selectedBillingStateId,
        selectedShippingStateId: update.selectedShippingStateId || prevState.selectedShippingStateId,
      };
      setAddressData({
        billingAddress: newState.billingAddress || {},
        shippingAddresses: newState.shippingAddresses || [],
      });
      return newState;
    });
  };

  const contactData = useMemo(() => ({
    primaryContact: sampleStore.primaryContact,
    secondaryContact: sampleStore.secondaryContact,
  }), [sampleStore.primaryContact, sampleStore.secondaryContact]);

  const steps = useMemo(() => [
    {
      name: 'Company Details',
      component: <Step1 getStore={getStore} updateStore={updateStore} jumpToStep={jumpToStep} />,
    },
    {
      name: 'Address Details',
      component: <Step2 getStore={getStore} updateStore={updateStore} addressData={addressData} />,
    },
    {
      name: 'Contact Details',
      component: <Step3 getStore={getStore} updateStore={updateStore} contactData={contactData} />,
    },
    {
      name: 'Done',
      component: (
        <Step4 getStore={getStore} updateStore={updateStore} match={{ params: { companyId } }} />
      ),
    },
  ], [addressData, contactData, companyId]);

  return (
    <>
      <BreadCrumbs />
      <ComponentCardSteps title="Company Registration Process" steps={steps}>
        <div className="example">
          <div className="step-progress">{steps[currentStep].component}</div>
        </div>
      </ComponentCardSteps>
    </>
  );
};

export default CompanyRegistration;
