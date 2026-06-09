import { getBoards } from './board';

export const getProfileFromStorage = () => {
  return {
    username: localStorage.getItem('username') || 'User',
    email: localStorage.getItem('email') || '',
    userId: localStorage.getItem('userId') || '',
  };
};

export const getMyBoards = async () => {
  const data = await getBoards();
  return data || [];
};