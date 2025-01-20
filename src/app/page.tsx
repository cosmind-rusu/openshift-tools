// app/page.tsx
import QuotaTable from "@/components/QuotaTable";

export default function Home() {
    return (
        <main>
            <h1>Cuotas del Cluster OpenShift</h1>
            <QuotaTable />
        </main>
    );
}