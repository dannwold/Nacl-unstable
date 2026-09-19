export interface Subsystem {
  id: string;
  name: string;
  category: 'core' | 'hardware' | 'telephony' | 'graphics' | 'ipc' | 'automation';
  headerFile: string;
  sourceFile: string;
  description: string;
  status: 'active' | 'idle' | 'mocked';
  functions: string[];
  notes?: string;
}

export interface DocArticle {
  id: string;
  title: string;
  filename: string;
  category: string;
  content?: string;
}

export type SignalQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DEAD';

export interface DecodedCellTowerMetric {
  rsrp: number; // dBm (-120 to -50)
  rsrq: number; // dB (-20 to -3)
  rssnr: number; // dB (-10 to 30)
  pci: number; // 0 to 503
  quality: SignalQuality;
  band: number; // LTE/NR band e.g. 71, 41, 66
  frequency: number; // MHz
  techString: string; // "5G NR-SA", "4G LTE-A"
  earfcn: number;
  cgi: string;
  tac: number;
  mcc: number;
  mnc: number;
}

export interface AudioFrame {
  rms: number;
  peak: number;
  db: number;
  envelope: number[];
}

export interface AdbDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: 'disconnected' | 'discovering' | 'pairing' | 'connected';
  pairingCode?: string;
}

export interface QuickJSLog {
  id: string;
  timestamp: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'native';
  text: string;
}
