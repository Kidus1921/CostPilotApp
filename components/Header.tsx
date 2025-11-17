
import React from 'react';
import { SearchIcon, BellIcon } from './IconComponents';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between h-20 px-6 bg-base-100 border-b">
      <div className="flex items-center">
        <div className="relative">
          <SearchIcon className="absolute w-5 h-5 text-gray-400 top-1/2 left-3 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, reports..."
            className="w-full max-w-xs pl-10 pr-4 py-2 border rounded-full bg-base-200 focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative p-2 rounded-full hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
          <BellIcon className="w-6 h-6 text-gray-500" />
          <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-brand-secondary ring-2 ring-white" />
        </button>
        <div className="flex items-center">
          <img
            className="h-10 w-10 rounded-full object-cover"
            src="https://picsum.photos/100"
            alt="User avatar"
          />
          <div className="ml-3">
            <p className="text-sm font-semibold text-base-content">Alex Thompson</p>
            <p className="text-xs text-base-content-secondary">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
