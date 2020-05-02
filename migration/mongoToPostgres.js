const terminate = require('../api/helpers/terminate');
const models = require('../api/models');
const dbSchemas = require('./db_schemas');
const {createGame} = require('../api/services/games');
const data = require('./data');
const mapping = {};
function convertDate(date){
    if (!date || date ==='null') {
        return new Date();
    }
    const day = parseInt(date.substr(0,2));
    const month = parseInt(date.substr(3,2));
    const year = parseInt(date.substr(6,4));
    return `${year}-${month}-${day}`;
  //  const result = new Date(year, month-1,day,0,0,0);
  //  return result;
}

const exitHandler = terminate(null, {
    coredump: false, timeout: 500,
});
process.on('uncaughtException', exitHandler(1, 'Uncaught Exception'));
process.on('unhandledRejection', exitHandler(1, 'Unhandled Promise'));
process.on('SIGTERM', exitHandler(0, 'SIGTERM'));
process.on('SIGINT', exitHandler(0, 'SIGINT'));



async function createTables(){
    console.log('createTables start');
    for (const tableData of dbSchemas.tables){
        try {
            console.log('adding table:',tableData.tableName);
            await models.sequelize.query(`CREATE TABLE ${tableData.tableName} (${tableData.columns.join(',')});`);
            console.log('table added. ',tableData.tableName);
            console.log('');
        } catch (e) {
            console.error(e.message)
        }
    }

    console.log('createTables end');

}

async function clearAllDataFromDB(){

    const group = await models.groups.findOne({name: data.name});

    if (group){
        console.log(`clearAllDataFromDB group name: ${data.name},  `,group.toJSON());
        const groupId = group.id;
        console.log('clearAllDataFromDB start.   groupId',groupId);
        await models.sequelize.query(`DELETE from games_data where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from games where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from players where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from users_players where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from games_data where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from invitations_requests where group_id = '${groupId}'`);
        await models.sequelize.query(`DELETE from groups where id = '${groupId}'`);
        console.log('clearAllDataFromDB end');
    }else{
        console.log(`clearAllDataFromDB group name: ${data.name}  - not in db` );
        console.log('clearAllDataFromDB skip');
    }


}

async function createPlayers(groupId){

    const playersToCreate = Object.values(data.players).map(({firstName, familyName,isAdmin,email})=>{
        return {
            name: `${firstName} ${familyName}`,
            firstName,
            familyName,
            isAdmin,
            groupId,
            email
        };
    });
    let players;

    try {
        players = await Promise.all(playersToCreate.map(player => models.players.create({...player, email:null})));
    } catch (err) {
        console.error('failed to create player');
        console.error(err);
        process.exit(-1);
    }
    console.log('## players created:', players.length);
    await Promise.all(players.map(async (player, index)=>{
        mapping[Object.keys(data.players)[index]] = player.id;
        const email = playersToCreate[index].email;
        if (email && email.length>2){
            const p = playersToCreate[index];
            const isAdmin = !!p.isAdmin;
            if (isAdmin){
                const userData = {
                    firstName: p.firstName,
                    familyName: p.familyName,
                    email: p.email,
                    imageUrl: p.imageUrl,
                    token: 'xx',
                    tokenExpiration: new Date()
                };
                let user = await models.users.findOne({where:{email:p.email}});
                if (!user){
                    user = await models.users.create(userData);
                }
                const userPlayer = {
                    userId: user.id,
                    playerId: player.id,
                    groupId,
                    isAdmin: true
                };

                await models.usersPlayers.create(userPlayer);
            }
        }
    }));

}
async function createGames(groupId) {
    const gamesToCreate = data.games.map(({name, extraData, players})=>{
        const playersData = players.map(({id, exit,enter}) =>{
            const playerId = mapping[id];
            if (!playerId) {
                console.error('!!!!!!!!!!! player id not found in mapping', { id })
            }
            const buyIn = parseInt(enter);
            const cashOut = parseInt(exit);

            return {
                playerId,
                buyIn,
                cashOut,
            } ;
        });
        return {
            date: convertDate(name),
            description: extraData,
            playersData,
            groupId
        };
    });

    await Promise.all(gamesToCreate.map(game => createGame(groupId, game)));
}
async function doStuff() {
    console.log('################');
    console.log('migration start');
    console.log('################');
    await createTables();
    await clearAllDataFromDB();

    const group = await models.groups.create({name: data.name, description: data.description});
    const groupId = group.id;

    await createPlayers(groupId);
    await createGames(groupId);


    console.log('########');
    console.log('DONE');
    process.exit(0);
}
doStuff();
