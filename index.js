// var container = require('rhea');
// container.on('connection_open', function (context) {
//     context.connection.open_receiver('examples');
//     context.connection.open_sender('examples');
// });
// container.on('message', function (context) {
    
//     console.log(context.message);
//     // context.connection.close();
// });
// container.once('sendable', function (context) {
//     setInterval(function () {
//         context.sender.send({body:'Hello World!'});
//     }, 2000)
// });
// container.options.username = 'admin'
// container.options.password = 'admin'
// container.connect({'port':5672});

// let list = [
//     "amqp://localhost:5672",
//     "amqp://localhost",
//     "amqp://user:pw@localhost",
//     "amqp://user:@localhost:5672",
//     "amqp://:pw@localhost"
// ]

// function tokenizer(url) {
//     console.log(url)
//     let tokenized = {
//         username: undefined,
//         password: undefined,
//         host: undefined,
//         port: undefined
//     }

//     if (typeof url !== 'string') {
//         throw Error('must be a string')
//     }

//     let clean = url.split('amqp://')
//     if (clean[0] !== '' || typeof clean[1] !== 'string') {
//         throw Error('Invalid')
//     }

//     clean = clean[1]
//     let separated = clean.split('@')
//     let hostinfo = null
//     let user = null
//     if (separated.length === 1) hostinfo = separated[0].split(':') 
//     else if (separated.length === 2) {
//         user = separated[0].split(":")
//         hostinfo = separated[1].split(":")
//     }    
//     else throw Error('Invalid')
    
//     tokenized.host = hostinfo[0]
//     if (typeof hostinfo[1] !== 'undefined') {
//         tokenized.port = parseInt(hostinfo[1], 10)
//     }
//     if (user) {
//         try {
//             tokenized.username = user[0]
//             tokenized.password = user[1]
//         } catch(e) {
//             throw Error('Invalid')
//         }
//     }

//     return tokenized
// }

// for (let item of list) {
//     console.log(tokenizer(item))
//     console.log('-----------------')
// }




// var amqpClient = require('./dist/amqpClient').default
// var env = require('./dist/env').default

// amqpClient.test(env('AMQP_TYPEQUEUE_URL')).then((valid) => {
//     console.log('valid:', valid)
// })



var helper = require('./dist/helper')
var type = new helper.default.TypeQueue()

type.connect().then(() => {
    
    type.listen((message) => {    
        console.log(message.content)  
        message.ack()
    })

    // setInterval(() => {
    //     type.publish('test').then(() => {
    //         console.log('published')
    //     }).catch((error) => {
    //         console.log(error)
    //     })
        
    // }, 1000)
})