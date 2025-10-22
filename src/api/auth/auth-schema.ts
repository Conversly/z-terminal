import * as yup from 'yup';

export const googleOauthSchema = yup.object().shape({
  code: yup.string().optional().nullable(),
  credential: yup.string().optional().nullable(),
  isVerify: yup.boolean().optional().default(false),
});