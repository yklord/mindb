min.store = new IndexedStore('myapp');

min.multi()
  .incr('user_id')
  .incr('user_id')
  .incr('user_id')
  .exec(function(err, results) {
    if (err) {
      return console.error(err);
    }

    console.dir(results);
  });