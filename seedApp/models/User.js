
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
	login: String,
	password: String,
	mail: String, //?? garder ??
	avatar: String,
	role: { type: Number, default: 1 }
});


/**
 * Methods statics
 */

UserSchema.statics = {
	getByIdFormatShow: function (id, cb) {
		this.findOne({ _id: id })
			.select('-passsword -mail')
			.exec(function (err, user) {
				if (err)
					return cb(err);
				return cb(null, user.toObject());
			});
	}
};

module.exports = mongoose.model('User', UserSchema);
