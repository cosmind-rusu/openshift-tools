// src/lib/k8s.ts
import { ClusterInfo, ResourceQuota } from '@/types';
import * as k8s from '@kubernetes/client-node';

export class K8sClient {
  private static instance: K8sClient;
  private kc: k8s.KubeConfig;
  private coreV1Api: k8s.CoreV1Api | undefined;

  private constructor() {
    console.log('Initializing K8sClient constructor');
    this.kc = new k8s.KubeConfig();
    this.initialize();
  }

  public static getInstance(): K8sClient {
    console.log('Getting K8sClient instance');
    if (!K8sClient.instance) {
      console.log('Creating new K8sClient instance');
      K8sClient.instance = new K8sClient();
    }
    return K8sClient.instance;
  }

  private initialize(): void {
    try {
      console.log('Starting K8sClient initialization');
      const apiUrl = process.env.OPENSHIFT_API_URL;
      const token = process.env.OPENSHIFT_TOKEN;
      const user = process.env.OPENSHIFT_USER || 'kubeadmin';

      console.log('Environment variables check:', {
        hasApiUrl: !!apiUrl,
        apiUrlLength: apiUrl?.length,
        hasToken: !!token,
        tokenLength: token?.length,
        user: user,
        nodeEnv: process.env.NODE_ENV
      });

      if (!apiUrl || !token) {
        throw new Error('OPENSHIFT_API_URL and OPENSHIFT_TOKEN must be set in environment variables');
      }

      const cluster = {
        name: 'openshift',
        server: apiUrl,
        skipTLSVerify: true,
      };

      const userConfig = {
        name: user,
        token: token,
      };

      const context = {
        name: 'openshift-context',
        user: userConfig.name,
        cluster: cluster.name,
      };

      console.log('Loading KubeConfig with options:', {
        clusterName: cluster.name,
        server: cluster.server,
        userName: userConfig.name,
        contextName: context.name
      });

      this.kc.loadFromOptions({
        clusters: [cluster],
        users: [userConfig],
        contexts: [context],
        currentContext: context.name,
      });
      
      console.log('Creating CoreV1Api client');
      this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
      console.log('K8sClient initialization completed successfully');
    } catch (error) {
      console.error('Error initializing K8s client:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    console.log('Testing cluster connection');
    try {
      if (!this.coreV1Api) {
        console.error('Connection test failed: CoreV1Api is not initialized');
        throw new Error('CoreV1Api is not initialized');
      }
      console.log('Attempting to list namespaces to test connection');
      await this.coreV1Api.listNamespace();
      console.log('Connection test successful');
      return true;
    } catch (error) {
      console.error('Connection test failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error instanceof Error ? (error as any).response?.body : undefined,
        status: error instanceof Error ? (error as any).response?.statusCode : undefined
      });
      return false;
    }
  }

  public async getClusterInfo(): Promise<ClusterInfo> {
    console.log('Getting cluster info');
    try {
      console.log('Creating VersionApi client');
      const versionApi = this.kc.makeApiClient(k8s.VersionApi);
      console.log('Fetching cluster version');
      const version = await versionApi.getCode();
      console.log('Cluster version fetched successfully:', version);
      return {
        version: version.gitVersion || 'Unknown',
        platform: 'OpenShift',
        status: 'Connected'
      };
    } catch (error) {
      console.error('Error getting cluster info:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        version: 'Unknown',
        platform: 'Unknown',
        status: 'Error'
      };
    }
  }

  public async listNamespaces() {
    console.log('Listing namespaces');
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }
      console.log('Fetching namespace list');
      const response = await this.coreV1Api.listNamespace();
      console.log(`Found ${response.items.length} namespaces`);
      return response.items;
    } catch (error) {
      console.error('Error listing namespaces:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error instanceof Error ? (error as any).response?.body : undefined
      });
      throw error;
    }
  }

  public async getNamespaceQuotas(namespace?: string): Promise<ResourceQuota[]> {
    console.log('Getting resource quotas', { namespace });
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      let response;
      if (namespace) {
        console.log(`Fetching quotas for namespace: ${namespace}`);
        response = await this.coreV1Api.listNamespacedResourceQuota({ namespace });
      } else {
        console.log('Fetching quotas for all namespaces');
        response = await this.coreV1Api.listResourceQuotaForAllNamespaces();
      }

      console.log(`Found ${response.items.length} quotas`);
      return response.items.map(quota => {
        console.log('Processing quota:', quota.metadata?.name);
        return {
          name: quota.metadata?.name || '',
          namespace: quota.metadata?.namespace || '',
          hard: quota.spec?.hard || {},
          used: quota.status?.used || {}
        };
      });
    } catch (error) {
      console.error('Error fetching quotas:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        namespace,
        response: error instanceof Error ? (error as any).response?.body : undefined
      });
      throw error;
    }
  }

  public async getNamespaceDetails(namespace: string) {
    console.log(`Getting details for namespace: ${namespace}`);
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      console.log('Fetching namespace details and quotas in parallel');
      const [nsDetail, quotas] = await Promise.all([
        this.coreV1Api.readNamespace({ name: namespace }),
        this.getNamespaceQuotas(namespace)
      ]);

      console.log('Namespace details fetched successfully');
      return {
        name: nsDetail.metadata?.name || '',
        status: nsDetail.status?.phase || '',
        quotas,
        metadata: nsDetail.metadata,
        spec: nsDetail.spec
      };
    } catch (error) {
      console.error(`Error fetching details for namespace ${namespace}:`, {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error instanceof Error ? (error as any).response?.body : undefined
      });
      throw error;
    }
  }

  public async getResourceQuotaUsage(namespace: string, quotaName: string) {
    console.log(`Getting quota usage for ${quotaName} in namespace ${namespace}`);
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      console.log('Fetching quota details');
      const quota = await this.coreV1Api.readNamespacedResourceQuota({ name: quotaName, namespace });
      console.log('Quota details fetched successfully');
      
      return {
        name: quota.metadata?.name || '',
        namespace: quota.metadata?.namespace || '',
        hard: quota.spec?.hard || {},
        used: quota.status?.used || {}
      };
    } catch (error) {
      console.error(`Error fetching quota ${quotaName} in namespace ${namespace}:`, {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error instanceof Error ? (error as any).response?.body : undefined
      });
      throw error;
    }
  }
}