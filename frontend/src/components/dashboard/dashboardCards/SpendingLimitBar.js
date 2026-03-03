import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SpendingLimitService from '../../../services/SpendingLimitService';
import { getCompanyCurrency } from '../../../pages/localStorageUtil';

const SpendingLimit = ({ companyId, userId }) => {
  const [spendingData, setSpendingData] = useState({
    spendingLimit: 0,
    amountSpent: 0,
    isLoading: true,
    error: null,

  });

  useEffect(() => {
    const fetchSpendingLimits = async () => {
      try {
        if (!companyId || !userId) {
          setSpendingData((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        const allLimitsResponse = await SpendingLimitService.getAllSpendingLimits(companyId);
        if (!allLimitsResponse.data?.length) {
          setSpendingData((prev) => ({ ...prev, isLoading: false }));
          console.warn('No spending limits available.');
          return;
        }

        const currentMonth = new Date().getMonth();
        const startDate = new Date();
        const endDate = new Date();

        if (currentMonth <= 2) {
          startDate.setMonth(0, 1);
          endDate.setMonth(2, 31);
        } else if (currentMonth <= 5) {
          startDate.setMonth(3, 1);
          endDate.setMonth(5, 30);
        } else if (currentMonth <= 8) {
          startDate.setMonth(6, 1);
          endDate.setMonth(8, 30);
        } else {
          startDate.setMonth(9, 1);
          endDate.setMonth(11, 31);
        }

        const limitDetailsResponse = await SpendingLimitService.getSpendingLimitResponse(
          companyId,
          userId,
          startDate,
          endDate,
        );

        setSpendingData({
          spendingLimit: limitDetailsResponse.data?.spendingLimit || 0,
          amountSpent: limitDetailsResponse.data?.amountSpent || 0,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching spending limits:', error);
        setSpendingData({
          spendingLimit: 0,
          amountSpent: 0,
          isLoading: false,
          error: error.message,
        });
      }
    };

    fetchSpendingLimits();
  }, [companyId, userId]);

  if (spendingData.isLoading || spendingData.spendingLimit <= 0) {
    return null;
  }

  return (
    <div className="spending-progress-container">
      <div className="spending-progress-header">
        <span className="spending-progress-title">Spending Limit</span>
        <span className="spending-progress-stats">
          {spendingData.spendingLimit.toLocaleString('en-US', {
            style: 'currency',
            currency: getCompanyCurrency(),
            maximumFractionDigits: 0,
          })}
        </span>
      </div>

      <div className="spending-progress-bar">
        <div
          className="spending-progress-spent"
          style={{
            width: `${Math.min(
              100,
              (spendingData.amountSpent / spendingData.spendingLimit) * 100,
            )}%`,
            backgroundColor: '#F44336',
          }}
        />

        {spendingData.amountSpent < spendingData.spendingLimit && (
          <div
            className="spending-progress-remaining"
            style={{
              width: `${100 - (spendingData.amountSpent / spendingData.spendingLimit) * 100}%`,
              backgroundColor: '#4CAF50',
            }}
          />
        )}
      </div>

      <div className="spending-progress-labels">
        <span>
          Spent:{' '}
          {spendingData.amountSpent.toLocaleString('en-US', {
            style: 'currency',
            currency: getCompanyCurrency(),
            maximumFractionDigits: 0,
          })}
        </span>
        <span>
          Remaining:{' '}
          {(spendingData.spendingLimit - spendingData.amountSpent).toLocaleString('en-US', {
            style: 'currency',
            currency: getCompanyCurrency(),
            maximumFractionDigits: 0,
          })}
        </span>
      </div>
    </div>
  );
};

SpendingLimit.propTypes = {
    companyId: PropTypes.string.isRequired,
    userId: PropTypes.string.isRequired,
  };

export default SpendingLimit;