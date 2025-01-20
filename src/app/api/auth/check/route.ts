// src/app/api/auth/check/route.ts
import { NextResponse } from 'next/server';
import { K8sClient } from '@/lib/k8s';
import { AuthResponse } from '@/types';

export async function GET(): Promise<NextResponse<AuthResponse>> {
  try {
    const k8sClient = K8sClient.getInstance();
    const isConnected = await k8sClient.testConnection();

    return NextResponse.json({
      isAuthenticated: isConnected
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      isAuthenticated: false,
      error: error instanceof Error ? error.message : 'Authentication check failed'
    });
  }
}