import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseClass = "btn";
    const variantClass = variant === 'primary' ? "btn-primary" : "btn-secondary";

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`${baseClass} ${variantClass} ${className}`}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
