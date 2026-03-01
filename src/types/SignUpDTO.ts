export type SignUpDTO = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  position: string;
  companyName: string;
  companyInfo?: string;
  timeZoneId?: string;
};
