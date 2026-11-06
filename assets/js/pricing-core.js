(function (root, factory) {
    const pricing = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = pricing;
    }

    if (root) {
        root.BeautifyPricing = pricing;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function calculateTotals(items) {
        if (!Array.isArray(items)) {
            throw new TypeError('Pricing items must be an array.');
        }

        return items.reduce(function (totals, item) {
            if (!item || !Number.isFinite(Number(item.price)) ||
                !Number.isFinite(Number(item.originalPrice))) {
                throw new TypeError('Each pricing item must have valid price and originalPrice values.');
            }

            const price = Number(item.price);
            const originalPrice = Number(item.originalPrice);

            if (price < 0 || originalPrice < 0) {
                throw new RangeError('Prices cannot be negative.');
            }

            totals.offerTotal += price;
            totals.regularTotal += originalPrice;
            return totals;
        }, { offerTotal: 0, regularTotal: 0, savings: 0 });
    }

    function getSavings(regularTotal, offerTotal) {
        const regular = Number(regularTotal);
        const offer = Number(offerTotal);

        if (!Number.isFinite(regular) || !Number.isFinite(offer) || regular < 0 || offer < 0) {
            throw new TypeError('Totals must be finite, non-negative numbers.');
        }

        return Math.max(0, regular - offer);
    }

    function formatINR(amount) {
        const value = Number(amount);

        if (!Number.isFinite(value)) {
            throw new TypeError('Amount must be a finite number.');
        }

        return '₹' + value.toLocaleString('en-IN');
    }

    return Object.freeze({
        calculateTotals: calculateTotals,
        getSavings: getSavings,
        formatINR: formatINR
    });
});
