const SavedPlace = require('../models/SavedPlace');

class PlaceController {
    // Get all saved places for the current user
    async getPlaces(req, res) {
        try {
            const places = await SavedPlace.find({ user: req.user.id }).sort({ createdAt: -1 });
            res.json(places);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }

    // Add a new saved place
    async addPlace(req, res) {
        const { label, address, latitude, longitude, icon } = req.body;

        try {
            const newPlace = new SavedPlace({
                user: req.user.id,
                label,
                address,
                latitude,
                longitude,
                icon
            });

            const place = await newPlace.save();
            res.json(place);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    }

    // Delete a saved place
    async deletePlace(req, res) {
        try {
            const place = await SavedPlace.findById(req.params.id);

            if (!place) {
                return res.status(404).json({ msg: 'Place not found' });
            }

            // Make sure user owns the place
            if (place.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: 'Not authorized' });
            }

            await place.deleteOne();
            res.json({ msg: 'Place removed' });
        } catch (err) {
            console.error(err.message);
            if (err.kind === 'ObjectId') {
                return res.status(404).json({ msg: 'Place not found' });
            }
            res.status(500).send('Server Error');
        }
    }
}

module.exports = new PlaceController();
