import { useState, useEffect } from 'react';
import MasterDataService from '../services/MasterDataService';

// Cache to prevent duplicate API calls across components
let countriesCache = null;
let countriesPromise = null;

const useCountries = () => {
  const [countries, setCountries] = useState(countriesCache || []);
  const [loading, setLoading] = useState(!countriesCache);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If already cached, use cache
    if (countriesCache) {
      setCountries(countriesCache);
      setLoading(false);
      return;
    }

    // If fetch is in progress, wait for it
    if (countriesPromise) {
      countriesPromise
        .then((data) => {
          setCountries(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
        });
      return;
    }

    // Start new fetch
    setLoading(true);
    countriesPromise = MasterDataService.getAllCountries()
      .then((response) => {
        countriesCache = response.data;
        setCountries(countriesCache);
        setLoading(false);
        countriesPromise = null;
        return countriesCache;
      })
      .catch((err) => {
        console.error('Error fetching countries:', err);
        setError(err);
        setLoading(false);
        countriesPromise = null;
        throw err;
      });
  }, []);

  return { countries, loading, error };
};

export default useCountries;
