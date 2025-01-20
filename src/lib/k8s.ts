// src/lib/k8s.ts
import { ClusterInfo, ResourceQuota } from '@/types';
import * as k8s from '@kubernetes/client-node';

export class K8sClient {
  private static instance: K8sClient;
  private kc: k8s.KubeConfig;
  private coreV1Api: k8s.CoreV1Api | undefined;

  private constructor() {
    this.kc = new k8s.KubeConfig();
    this.initialize();
  }

  public static getInstance(): K8sClient {
    if (!K8sClient.instance) {
      K8sClient.instance = new K8sClient();
    }
    return K8sClient.instance;
  }

  private initialize(): void {
    try {
      const apiUrl = process.env.OPENSHIFT_API_URL;
      const token = process.env.OPENSHIFT_TOKEN;

      if (!apiUrl || !token) {
        throw new Error('OPENSHIFT_API_URL and OPENSHIFT_TOKEN must be set in environment variables');
      }

      const cluster = {
        name: 'openshift',
        server: apiUrl,
        skipTLSVerify: true, // En producción, configura los certificados apropiadamente
      };

      const user = {
        name: 'openshift-user',
        token: token,
      };

      const context = {
        name: 'openshift',
        user: user.name,
        cluster: cluster.name,
      };

      this.kc.loadFromOptions({
        clusters: [cluster],
        users: [user],
        contexts: [context],
        currentContext: context.name,
      });
      
      this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
    } catch (error) {
      console.error('Error initializing K8s client:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }
      await this.coreV1Api.listNamespace();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  public async getClusterInfo(): Promise<ClusterInfo> {
    try {
      const version = await this.kc.makeApiClient(k8s.VersionApi).getCode();
      return {
        version: version.gitVersion,
        platform: 'OpenShift',
        status: 'Connected'
      };
    } catch (error) {
      return {
        version: 'Unknown',
        platform: 'Unknown',
        status: 'Error'
      };
    }
  }

  public async listNamespaces() {
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }
      const response = await this.coreV1Api.listNamespace();
      return response.items;
    } catch (error) {
      console.error('Error listing namespaces:', error);
      throw error;
    }
  }

  public async getNamespaceQuotas(namespace?: string): Promise<ResourceQuota[]> {
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      let response;
      if (namespace) {
        response = await this.coreV1Api.listNamespacedResourceQuota({ namespace });
      } else {
        response = await this.coreV1Api.listResourceQuotaForAllNamespaces();
      }

      return response.items.map(quota => ({
        name: quota.metadata?.name || '',
        namespace: quota.metadata?.namespace || '',
        hard: quota.spec?.hard || {},
        used: quota.status?.used || {}
      }));
    } catch (error) {
      console.error('Error fetching quotas:', error);
      throw error;
    }
  }

  public async getNamespaceDetails(namespace: string) {
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      const [nsDetail, quotas] = await Promise.all([
        this.coreV1Api.readNamespace({ name: namespace }),
        this.getNamespaceQuotas(namespace)
      ]);

      return {
        name: nsDetail.metadata?.name || '',
        status: nsDetail.status?.phase || '',
        quotas,
        metadata: nsDetail.metadata,
        spec: nsDetail.spec
      };
    } catch (error) {
      console.error(`Error fetching details for namespace ${namespace}:`, error);
      throw error;
    }
  }

  public async getResourceQuotaUsage(namespace: string, quotaName: string) {
    try {
      if (!this.coreV1Api) {
        throw new Error('CoreV1Api is not initialized');
      }

      const quota = await this.coreV1Api.readNamespacedResourceQuota({ name: quotaName, namespace });
      
      return {
        name: quota.metadata?.name || '',
        namespace: quota.metadata?.namespace || '',
        hard: quota.spec?.hard || {},
        used: quota.status?.used || {}
      };
    } catch (error) {
      console.error(`Error fetching quota ${quotaName} in namespace ${namespace}:`, error);
      throw error;
    }
  }
}