// src/app/api/cluster/route.ts
import { NextResponse } from 'next/server';
import { K8sClient } from '@/lib/k8s';
import { ClusterInfo, ResourceQuota } from '@/types';

export async function GET() {
  try {
    if (!process.env.OPENSHIFT_API_URL || !process.env.OPENSHIFT_TOKEN) {
      return NextResponse.json(
        { error: 'OpenShift configuration is missing' },
        { status: 500 }
      );
    }

    const k8sClient = K8sClient.getInstance();

    // Realizar todas las peticiones en paralelo para mejorar el rendimiento
    const [clusterInfo, namespaces, quotas] = await Promise.all([
      k8sClient.getClusterInfo(),
      k8sClient.listNamespaces(),
      k8sClient.getNamespaceQuotas()
    ]);

    // Procesar y validar los datos
    const processedNamespaces = namespaces.map((ns: { metadata?: { name?: string } }) => 
      ns.metadata?.name || 'unknown'
    ).filter(Boolean);

    // Agrupar cuotas por namespace para fácil acceso
    const quotasByNamespace = quotas.reduce((acc: { [key: string]: ResourceQuota[] }, quota) => {
      const namespace = quota.namespace;
      if (!acc[namespace]) {
        acc[namespace] = [];
      }
      acc[namespace].push(quota);
      return acc;
    }, {});

    return NextResponse.json({
      status: 'success',
      clusterInfo,
      namespaces: processedNamespaces,
      quotas,
      quotasByNamespace,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cluster info error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to get cluster information',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Endpoint para obtener detalles específicos de un namespace
export async function POST(request: Request) {
  try {
    const { namespace } = await request.json();

    if (!namespace) {
      return NextResponse.json(
        { error: 'Namespace is required' },
        { status: 400 }
      );
    }

    const k8sClient = K8sClient.getInstance();
    const namespaceDetails = await k8sClient.getNamespaceDetails(namespace);

    return NextResponse.json({
      status: 'success',
      data: namespaceDetails,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Namespace details error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to get namespace details',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}