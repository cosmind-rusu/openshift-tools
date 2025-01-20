// api/quotas/route.ts
import { NextResponse } from "next/server";
import * as k8s from "@kubernetes/client-node";

export async function GET() {
    try {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault(); // O usa loadFromFile si tienes un kubeconfig específico
        
        // Configuración de acceso desde variables de entorno
        const cluster = {
            name: "openshift-cluster",
            server: process.env.OPENSHIFT_API!,
            skipTLSVerify: true
        };
        
        const user = {
            name: "openshift-user",
            token: process.env.OPENSHIFT_TOKEN!
        };
        
        kc.loadFromOptions({ clusters: [cluster], users: [user], contexts: [], currentContext: "" });

        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        const response = await k8sApi.listNamespace();
        const namespaces = response.items.map((ns) => ns.metadata?.name).filter((name): name is string => !!name);
        const quotaApi = kc.makeApiClient(k8s.CoreV1Api);
        let quotas: any[] = [];
        
        for (const ns of namespaces) {
            try {
                const quotaRes = await quotaApi.listNamespacedResourceQuota({ namespace: ns });
                quotaRes.items.forEach(q => {
                    quotas.push({
                        namespace: ns,
                        name: q.metadata?.name,
                        hard: q.status?.hard
                    });
                });
            } catch (err) {
                console.error(`Error obteniendo quotas de ${ns}:`, err);
            }
        }

        return NextResponse.json(quotas);
    } catch (error) {
        return NextResponse.json({ error: "Error obteniendo cuotas" }, { status: 500 });
    }
}