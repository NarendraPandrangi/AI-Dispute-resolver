import React from 'react';

const Input = ({ label, id, error, className = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && <label htmlFor={id} className="text-sm font-medium text-gray-300">{label}</label>}
            <input
                id={id}
                className={`input-field ${error ? 'border-red-500 focus:border-red-500' : ''}`}
                {...props}
            />
            {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
    );
};

export default Input;
