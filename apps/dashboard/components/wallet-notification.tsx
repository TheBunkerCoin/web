import toast from 'react-hot-toast';
import type { IWalletNotification as AdapterWalletNotification } from '@jup-ag/wallet-adapter/dist/types/contexts/WalletConnectionProvider';

const toastStyle = {
  background: '#1a1a1a',
  color: '#fff',
  border: '1px solid #333',
};

const notifyInfo = (title: string, description?: string) => {
  const message = description ? `${title}: ${description}` : title;
  toast(message, { style: toastStyle });
};

const notifySuccess = (title: string, description?: string) => {
  const message = description ? `${title}: ${description}` : title;
  toast.success(message, { style: toastStyle });
};

const notifyWarning = (title: string, description?: string) => {
  const message = description ? `${title}: ${description}` : title;
  toast(message, { icon: '⚠️', style: toastStyle });
};

const notifyError = (title: string, description?: string) => {
  const message = description ? `${title}: ${description}` : title;
  toast.error(message, { style: toastStyle });
};

export const WalletNotification = {
  onConnecting: (props: AdapterWalletNotification) => {
    notifyInfo(`Connecting ${props.walletName}`, props.shortAddress);
  },
  onConnect: (props: AdapterWalletNotification) => {
    notifySuccess(`Connected ${props.walletName}`, props.shortAddress);
  },
  onDisconnect: (props: AdapterWalletNotification) => {
    notifyWarning(`Disconnected ${props.walletName}`, props.shortAddress);
  },
  onNotInstalled: (props: AdapterWalletNotification) => {
    notifyError(`${props.walletName} not installed`, 'Please install the wallet to continue.');
  },
};