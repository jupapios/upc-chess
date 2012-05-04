define('util/Base', ['require', 'util/Element'], function (require) {

	//var cfg = require('lib/cfg')

	return new Class({

		Implements: [Options],

		src: null,
		cfg: null,

		initialize: function (src, options) {
			this.init()

			this.src = $(src)
			this.src.store('widget', this)
			this.setOptions(options)
			this._fetchOptions()
			this.postMixinProperties()
			this.render()
			this.postCreate()
		},

		init: function () {},
		postCreate: function () {},
		postMixinProperties: function () {},
		render: function () {},

		_fetchOptions: function () {
			/*this.cfg = new cfg(this.src)
			Object.merge(this.options, this.cfg)*/
		}
	})
})