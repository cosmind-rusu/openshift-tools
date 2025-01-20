// src/types/index.ts

// Estado de conexión
export type ConnectionStatus = 'Connected' | 'Error';

// Información básica del cluster
export interface ClusterInfo {
  version: string;
  platform: string;
  status: ConnectionStatus;
}

// Interfaz para resource quotas
export interface ResourceQuota {
  name: string;
  namespace: string;
  hard: {
    [key: string]: string;
  };
  used: {
    [key: string]: string;
  };
}

// Interfaz principal para los datos del cluster
export interface ClusterData {
  status: 'success' | 'error';
  clusterInfo: ClusterInfo;
  namespaces: string[];
  quotas: ResourceQuota[];
  error?: string;
}

// Detalles de un namespace
export interface NamespaceDetails {
  name: string;
  status: string;
  quotas: ResourceQuota[];
  metadata?: any;
  spec?: any;
}

// Respuesta de la API de autenticación
export interface AuthResponse {
  isAuthenticated: boolean;
  error?: string;
}

// Interfaz para el contexto de autenticación
export interface AuthContextType {
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
}

// Props para componentes
export interface InfoCardProps {
  title: string;
  value: string;
}

export interface QuotaSectionProps {
  title: string;
  data: Record<string, string>;
}