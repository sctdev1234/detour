module.exports = function softDeletePlugin(schema) {
    schema.add({
        isDeleted: {
            type: Boolean,
            default: false
        },
        deletedAt: {
            type: Date,
            default: null
        }
    });

    const excludeDeleted = function (next) {
        // Exclude deleted documents if not explicitly requested
        if (this.getQuery().isDeleted === undefined) {
            this.where({ isDeleted: false });
        }
        next();
    };

    schema.pre('find', excludeDeleted);
    schema.pre('findOne', excludeDeleted);
    schema.pre('findOneAndUpdate', excludeDeleted);
    schema.pre('countDocuments', excludeDeleted);
    schema.pre('aggregate', function (next) {
        // Add a $match step at the beginning of the pipeline
        this.pipeline().unshift({ $match: { isDeleted: false } });
        next();
    });

    schema.methods.softDelete = async function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
    };

    schema.methods.restore = async function () {
        this.isDeleted = false;
        this.deletedAt = null;
        return this.save();
    };
};
