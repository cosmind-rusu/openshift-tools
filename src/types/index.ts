// src/types/index.ts

// Información básica del cluster
export interface ClusterInfo {
    version: string;
    platform: string;
    status: 'Connected' | 'Error';
  }
  
  // Interfaz para las cuotas de recursos
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
  
  // Interfaz para los datos del namespace
  export interface NamespaceInfo {
    name: string;
    status: string;
    quotas: ResourceQuota[];
  }
  
  // Interfaz para la respuesta completa de datos del cluster
  export interface ClusterData {
    clusterInfo: ClusterInfo;
    namespaces: string[];
    quotas: ResourceQuota[];
  }
  
  // Tipo para el estado de conexión
  export type ConnectionStatus = 'Connected' | 'Error' | 'Connecting';
  
  // Interfaz para los errores de la API
  export interface ApiError {
    message: string;
    code: string;
    details?: string;
  }