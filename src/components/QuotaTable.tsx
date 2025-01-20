// components/QuotaTable.tsx
'use client'
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import Papa from "papaparse";

export default function QuotaTable() {
    interface Quota {
        namespace: string;
        name: string;
        hard: Record<string, any>;
    }

    const [quotas, setQuotas] = useState<Quota[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/quotas")
            .then(res => res.json())
            .then(data => {
                setQuotas(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const downloadCSV = () => {
        const csv = Papa.unparse(quotas);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        saveAs(blob, "quotas.csv");
    };

    if (loading) return <p>Cargando...</p>;

    return (
        <div>
            <h2>Resource Quotas</h2>
            <button onClick={downloadCSV}>Descargar CSV</button>
            <table border={1}>
                <thead>
                    <tr>
                        <th>Namespace</th>
                        <th>Nombre</th>
                        <th>Recursos</th>
                    </tr>
                </thead>
                <tbody>
                    {quotas.map((q, i) => (
                        <tr key={i}>
                            <td>{q.namespace}</td>
                            <td>{q.name}</td>
                            <td>{JSON.stringify(q.hard)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}