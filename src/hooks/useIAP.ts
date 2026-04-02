import { useEffect, useState } from 'react';
import { useSubStore } from '../store';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

const REVENUECAT_API_KEY = 'appl_iHuTtIBepoBhyrNijUroKKLstPC';

export type PlanType = 'free' | 'pro5' | 'pro20';

export function useIAP() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>(cachedPackages);
  const [isLoading, setIsLoading] = useState(true);
  const [planType, setPlanType] = useState<PlanType>('free');

  const setPlan = useSubStore(s => s.setPlan);

  function updatePlan(info: CustomerInfo) {
    if (info.entitlements.active['pro20']) {
      setPlanType('pro20');
      setPlan('pro20_monthly');
    } else if (info.entitlements.active['pro5']) {
      setPlanType('pro5');
      setPlan('pro5_monthly');
    } else {
      setPlanType('free');
      setPlan('free');
    }
  }

  useEffect(() => {

    const loadData = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        updatePlan(info);
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          cachedPackages = offerings.current.availablePackages;
          setPackages(cachedPackages);
        }
      } catch (e) {
        console.log('IAP Error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  async function purchasePackage(pkg: PurchasesPackage) {
    try {
      const result = await Purchases.purchasePackage(pkg);
      updatePlan(result.customerInfo);
      return true;
    } catch (e) {
      console.log('Purchase Error:', e);
      return false;
    }
  }

  async function restorePurchases() {
    try {
      const info = await Purchases.restorePurchases();
      updatePlan(info);
      return true;
    } catch (e) {
      return false;
    }
  }

  return { planType, packages, isLoading, purchasePackage, restorePurchases };
}