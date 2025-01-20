// src/app/page.tsx
"use client"

import { useState, useEffect } from "react"
import type { ResourceQuota, ClusterData } from "@/types"

export default function Home() {
  const [clusterData, setClusterData] = useState<ClusterData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null)

  useEffect(() => {
    fetchClusterInfo()
  }, [])

  const fetchClusterInfo = async () => {
    try {
      const response = await fetch("/api/cluster")
      if (!response.ok) {
        throw new Error("Failed to fetch cluster info")
      }
      const data = await response.json()
      setClusterData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getQuotasForNamespace = (namespace: string): ResourceQuota[] => {
    if (!clusterData) return []
    return clusterData.quotas.filter((quota) => quota.namespace === namespace)
  }

  const downloadNamespacesCSV = () => {
    if (!clusterData) return

    const headers = "Namespace,HasQuota,QuotaName,CPU Limit,Memory Limit,CPU Used,Memory Used\n"
    const rows = clusterData.namespaces
      .map((namespace) => {
        const quotas = getQuotasForNamespace(namespace)
        if (quotas.length === 0) {
          return `${namespace},No,-,-,-,-,-`
        }

        return quotas
          .map((quota) => {
            const cpuLimit = quota.hard["limits.cpu"] || "-"
            const memoryLimit = quota.hard["limits.memory"] || "-"
            const cpuUsed = quota.used["limits.cpu"] || "-"
            const memoryUsed = quota.used["limits.memory"] || "-"

            return `${namespace},Yes,${quota.name},${cpuLimit},${memoryLimit},${cpuUsed},${memoryUsed}`
          })
          .join("\n")
      })
      .join("\n")

    const fullContent = headers + rows
    const blob = new Blob([fullContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", `openshift-namespaces-quotas-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-2xl font-semibold text-gray-700 flex items-center space-x-4 bg-white p-6 rounded-xl shadow-lg">
          <svg
            className="animate-spin h-10 w-10 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Loading cluster information...</span>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-2xl font-semibold text-red-700 bg-white p-8 rounded-xl shadow-lg border-l-4 border-red-500">
          Error: {error}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
          <h1 className="text-4xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
            OpenShift Tools
          </h1>
          <button
            onClick={downloadNamespacesCSV}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download Namespaces CSV</span>
          </button>
        </div>

        {clusterData && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <h2 className="text-2xl font-semibold mb-6 text-gray-700 border-b pb-2">Cluster Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InfoCard title="Version" value={clusterData.clusterInfo.version} />
                <InfoCard title="Platform" value={clusterData.clusterInfo.platform} />
                <InfoCard title="Status" value={clusterData.clusterInfo.status} />
              </div>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-700">Namespaces</h2>
                {selectedNamespace && (
                  <button
                    onClick={() => setSelectedNamespace(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {clusterData.namespaces.map((namespace) => {
                  const quotas = getQuotasForNamespace(namespace)
                  const hasQuota = quotas.length > 0

                  return (
                    <button
                      key={namespace}
                      onClick={() => setSelectedNamespace(namespace)}
                      className={`p-4 rounded-lg border text-left transition-all duration-200 ${
                        selectedNamespace === namespace
                          ? "bg-blue-100 border-blue-300 text-blue-800 shadow-md"
                          : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:shadow-md"
                      }`}
                    >
                      <div className="font-medium truncate">{namespace}</div>
                      <div className={`text-sm mt-1 ${hasQuota ? "text-green-600" : "text-yellow-600"}`}>
                        {hasQuota ? `${quotas.length} quota(s)` : "No quotas"}
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedNamespace && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-700">Quotas for {selectedNamespace}</h3>
                  {getQuotasForNamespace(selectedNamespace).length > 0 ? (
                    <div className="space-y-4">
                      {getQuotasForNamespace(selectedNamespace).map((quota) => (
                        <div
                          key={quota.name}
                          className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          <h4 className="font-semibold text-lg mb-4 text-blue-600">{quota.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <QuotaSection title="Hard Limits" data={quota.hard} />
                            <QuotaSection title="Current Usage" data={quota.used} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-600 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
                      No quotas defined for this namespace.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <h3 className="text-lg font-medium text-gray-600 mb-2">{title}</h3>
      <p className="text-xl font-semibold text-gray-800">{value}</p>
    </div>
  )
}

function QuotaSection({ title, data }: { title: string; data: Record<string, string> }) {
  return (
    <div>
      <h5 className="font-medium mb-2 text-gray-700">{title}</h5>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-b-0">
            <span className="text-gray-600">{key}:</span>
            <span className="font-medium text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

