export const computeSingleOptionDefaults = ({
  departments,
  projects,
  glAccounts,
  classes,
  locations,
  allShippingAddresses,
}, cartHeaderData, cartDetails = []) => {
  const headerUpdates = {};

  if (departments && departments.length === 1 && !cartHeaderData?.departmentId) {
    headerUpdates.departmentId = departments[0].departmentId;
  }
  if (allShippingAddresses && allShippingAddresses.length === 1 && !cartHeaderData?.shipToAddressId) {
    headerUpdates.shipToAddressId = allShippingAddresses[0].addressId;
  }
  if (projects && projects.length === 1 && !cartHeaderData?.projectId) {
    headerUpdates.projectId = projects[0].projectId;
  }
  if (glAccounts && glAccounts.length === 1 && !cartHeaderData?.glAccountId) {
    headerUpdates.glAccountId = glAccounts[0].glAccountId;
  }
  if (classes && classes.length === 1 && !cartHeaderData?.classId) {
    headerUpdates.classId = classes[0].classId;
  }
  if (locations && locations.length === 1 && !cartHeaderData?.locationId) {
    headerUpdates.locationId = locations[0].locationId;
  }

 
  const itemUpdates = cartDetails.map((item) => {
    const itemChanges = {};
    if (!item.departmentId && departments && departments.length === 1) {
      itemChanges.departmentId = departments[0].departmentId;
    }
    if (!item.projectId && projects && projects.length === 1) {
      itemChanges.projectId = projects[0].projectId;
    }
    if (!item.glAccountId && glAccounts && glAccounts.length === 1) {
      itemChanges.glAccountId = glAccounts[0].glAccountId;
    }
    if (!item.classId && classes && classes.length === 1) {
      itemChanges.classId = classes[0].classId;
    }
    if (!item.locationId && locations && locations.length === 1) {
      itemChanges.locationId = locations[0].locationId;
    }

    if (Object.keys(itemChanges).length === 0) return null;

    const requestBody = {
      ...item,
      ...itemChanges,
      cartDetailId: item.cartDetailId,
    };

    return { cartDetailId: item.cartDetailId, requestBody };
  }).filter(Boolean);

  return { headerUpdates, itemUpdates };
};
