/**
 * Account HTTP Controller
 *
 * Handles account lifecycle operations.
 */

import AccountSerializer from "../serializers/account.serializer.js";


export default class AccountController {

    constructor({
        createAccountUseCase,
        getAccountBalanceUseCase,
        listAccountsUseCase,
    }) {

        this.createAccountUseCase =
            createAccountUseCase;

        this.getAccountBalanceUseCase =
            getAccountBalanceUseCase;

        this.listAccountsUseCase =
            listAccountsUseCase;

    }


    /**
     * POST /accounts
     */
    createAccount = async (req, res, next) => {

        try {

            const command = {

                ...req.body,

                tenantId:
                    req.actor?.tenantId,

                createdBy:
                    req.actor?.id,

            };


            const account =
                await this.createAccountUseCase.execute(
                    command
                );


            return res
                .status(201)
                .json({

                    success: true,

                    data:
                        AccountSerializer.serialize(
                            account
                        ),

                });


        } catch(error){

            next(error);

        }

    };



    /**
     * GET /accounts/:id/balance
     */
    getBalance = async (req,res,next)=>{

        try {


            const query = {

                id:
                    req.params.id,

                tenantId:
                    req.actor?.tenantId,

            };


            const balance =
                await this.getAccountBalanceUseCase.execute(
                    query
                );


            return res.json({

                success:true,

                data:
                    AccountSerializer.serialize(
                        balance
                    ),

            });


        } catch(error){

            next(error);

        }

    };



    /**
     * GET /accounts
     */
    listAccounts = async(req,res,next)=>{

        try {


            if(!this.listAccountsUseCase){

                return res.status(501).json({

                    success:false,

                    message:
                        "Account listing not implemented"

                });

            }


            const accounts =
                await this.listAccountsUseCase.execute({

                    tenantId:
                        req.actor?.tenantId,

                });



            return res.json({

                success:true,

                data:
                    accounts.map(
                        AccountSerializer.serialize
                    ),

            });


        } catch(error){

            next(error);

        }

    };


}