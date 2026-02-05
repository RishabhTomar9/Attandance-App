const Card = ({ title, children, className = "" }) => {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-100 ${className}`}>
            {title && <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>}
            {children}
        </div>
    );
};

export default Card;
