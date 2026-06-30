class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    async create(data) {
        const entity = new this.model(data);
        return await entity.save();
    }

    async findById(id, includeDeleted = false) {
        const query = { _id: id };
        if (!includeDeleted) {
            query.isDeleted = false;
        }
        return await this.model.findOne(query);
    }

    async findOne(filter = {}, includeDeleted = false) {
        const query = { ...filter };
        if (!includeDeleted) {
            query.isDeleted = false;
        }
        return await this.model.findOne(query);
    }

    async find(filter = {}, options = {}, includeDeleted = false) {
        const query = { ...filter };
        if (!includeDeleted) {
            query.isDeleted = false;
        }
        
        let queryBuilder = this.model.find(query);
        
        if (options.sort) queryBuilder = queryBuilder.sort(options.sort);
        if (options.populate) queryBuilder = queryBuilder.populate(options.populate);
        if (options.limit) queryBuilder = queryBuilder.limit(options.limit);
        if (options.skip) queryBuilder = queryBuilder.skip(options.skip);

        return await queryBuilder.exec();
    }

    async update(id, data) {
        return await this.model.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $set: data },
            { new: true, runValidators: true }
        );
    }

    async delete(id) {
        // Soft delete
        return await this.model.findOneAndUpdate(
            { _id: id },
            { $set: { isDeleted: true } },
            { new: true }
        );
    }

    async hardDelete(id) {
        return await this.model.findByIdAndDelete(id);
    }

    async count(filter = {}, includeDeleted = false) {
        const query = { ...filter };
        if (!includeDeleted) {
            query.isDeleted = false;
        }
        return await this.model.countDocuments(query);
    }
}

module.exports = BaseRepository;
