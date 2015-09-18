  # it 'should insert an array of arrays of values', (done) ->
  #   model =
  #     schema: schemaArrayOfArraysOfValues
  #   doc =
  #     account:
  #       locations: [ ['sf', 'bos'], ['nyc', 'mia'] ]
  #
  #   db.addModel('users', model)
  #   db.users.insert(doc).then (result) ->
  #     db.users.findOne({}).then (result) ->
  #       result.account.locations.length.should.eql(2)
  #       result.account.locations[0].length.should.eql(2)
  #       result.account.locations[0][0].should.eql('sf')
  #       result.account.locations[0][1].should.eql('bos')
  #       result.account.locations[1].length.should.eql(2)
  #       result.account.locations[1][0].should.eql('nyc')
  #       result.account.locations[1][1].should.eql('mia')
  #       done()
