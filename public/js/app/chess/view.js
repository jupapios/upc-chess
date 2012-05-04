define('app/chess/view', function () {

	return new Class({

		Implements: [Options],

		options: {
			dom: {}
		},

		src: null,

		presenter: null,

		initialize: function (presenter) {

			this.presenter = presenter
			this._dom()
			this._events()

		},

		_dom: function () {

		},

		_events: function () {

		}
		
	})
})