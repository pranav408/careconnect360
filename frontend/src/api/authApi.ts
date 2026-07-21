import { apiClient } from './apiClient'
import type {
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterPatientRequest,
  RegisterPatientResponse,
} from '../types/auth'

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', request)
  return data
}

export async function registerPatient(
  request: RegisterPatientRequest,
): Promise<RegisterPatientResponse> {
  const { data } = await apiClient.post<RegisterPatientResponse>(
    '/auth/register/patient',
    request,
  )
  return data
}

export async function getCurrentAuthenticatedUser(): Promise<CurrentUserResponse> {
  const { data } = await apiClient.get<CurrentUserResponse>('/auth/me')
  return data
}
