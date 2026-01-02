import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', title, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`glass-panel p-6 ${className}`}
            {...props}
        >
            {title && <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>}
            {children}
        </motion.div>
    );
};

export default Card;
