const { users, roles, permissions, companies, user_companies } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const SECRET_KEY = process.env.JWT_SECRET;

module.exports = {

    // 📌 LOGIN DE USUARIO
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Validar email
            if (!email) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Ingrese su email"
                });
            }

            // Validar password
            if (!password) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Ingrese su contraseña"
                });
            }

            // Buscar usuario con sus roles y permisos
            const userForLogin = await users.findOne({
                where: { email: email },
                include: [
                    {
                        model: roles,
                        as: 'role',
                        include: [{
                            model: permissions,
                            as: 'permissions',
                            attributes: ['name', 'code', 'description', 'is_active'],
                            through: { attributes: [] }
                        }]
                    },
                    {
                        model: companies,
                        as: 'owned_companies',
                        attributes: [
                            'id', 
                            'name', 
                            'legal_name',
                            'tax_id', 
                            'email', 
                            'phone',
                            'address', 
                            'city', 
                            'state', 
                            'country',
                            'postal_code', 
                            'logo_url', 
                            'website',
                            'is_active',
                            'is_default'
                        ]
                    }
                ]
            });

            // Verificar si el usuario existe
            if (!userForLogin) {
                return res.status(404).json({
                    success: false,
                    status: 404,
                    message: "El usuario ingresado no existe"
                });
            }

            // Verificar contraseña usando el método del modelo
            const passwordMatch = await userForLogin.validatePassword(password);
            if (!passwordMatch) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "Contraseña incorrecta"
                });
            }

            // Generar token JWT
            const token = jwt.sign(
                {
                    id: userForLogin.id,
                    email: userForLogin.email,
                    role_id: userForLogin.role.id
                },
                SECRET_KEY,
                { expiresIn: '8h' }
            );

            // Actualizar último login
            await userForLogin.updateLastLogin();

            // Procesar el teléfono para separar código de país y número
            let countryCode = undefined;
            let phoneNumber = undefined;

            if (userForLogin.phone) {
                if (userForLogin.phone.includes('-')) {
                    [countryCode, phoneNumber] = userForLogin.phone.split('-');
                } else {
                    phoneNumber = userForLogin.phone;
                }
            }

            // Preparar objeto de usuario para la respuesta
            const user = {
                id: userForLogin.id,
                email: userForLogin.email,
                name: userForLogin.first_name,
                lastName: userForLogin.last_name,
                countryCode: countryCode,
                phone: phoneNumber,
                status: userForLogin.status,
                role: {
                    id: userForLogin.role.id,
                    name: userForLogin.role.name
                },
                companies: userForLogin.owned_companies.map(company => ({
                    id: company.id,
                    name: company.name,
                    legalName: company.legal_name,
                    taxId: company.tax_id,
                    email: company.email,
                    phone: company.phone,
                    address: company.address,
                    city: company.city,
                    state: company.state,
                    country: company.country,
                    postalCode: company.postal_code,
                    logoUrl: company.logo_url,
                    website: company.website,
                    isActive: company.is_active,
                    isDefault: company.is_default
                })),
                permissions: userForLogin.role.permissions.map(perm => ({
                    name: perm.name,
                    code: perm.code,
                    description: perm.description || '',
                    isActive: perm.is_active
                }))
            };

            // Enviar respuesta exitosa
            return res.status(200).json({
                success: true,
                status: 200,
                message: "Login exitoso",
                token,
                user
            });

        } catch (error) {
            console.error("❌ Error en login:", error);
            return res.status(500).json({
                success: false,
                status: 500,
                message: "Error interno del servidor"
            });
        }
    },

    // 📌 REGISTRAR USUARIO + Token Automático
    async register(req, res) {
        try {
            const { password, email, name, role_id, phone } = req.body;

            // Validaciones
            if (!password || !email || !name || !role_id || !phone) {
                return res.status(400).json({ message: "Todos los campos son obligatorios" });
            }

            // Verificar si el role_id existe
            const roleExists = await roles.findByPk(role_id);
            if (!roleExists) {
                return res.status(400).json({ message: "El role_id proporcionado no existe" });
            }

            // Verificar si el usuario ya existe
            const userExists = await users.findOne({ where: { email } });
            if (userExists) {
                return res.status(400).json({ message: "El email proporcionado ya está en uso" });
            }

            // Hashear la contraseña
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Crear usuario
            const newUser = await users.create({
                password: hashedPassword,
                email,
                name,
                role_id,
                phone
            });

            // **🔹 Generar un token JWT al registrarse**
            const token = jwt.sign({ id: newUser.id, email: newUser.email, role_id: newUser.role_id }, SECRET_KEY, { expiresIn: '8h' });

            console.log("✅ Usuario creado:", newUser);

            const userWithoutPassword = {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role_id: newUser.role_id,
                phone: newUser.phone
            };

            res.status(201).json({ message: "Usuario registrado exitosamente", token, user: userWithoutPassword });

        } catch (error) {
            console.error("❌ Error en register:", error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 📌 Obtener todos los usuarios
    async list(req, res) {
        console.log("📌 Llegó a la función list");
        try {
            const allUsers = await users.findAll();
            res.status(200).json(allUsers);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 📌 Obtener todos los usuarios vendedores de una compañía específica
    async getSellers(req, res) {
        console.log("📌 Intentando obtener vendedores de una compañía...", req.params);

        try {
            const { company_id } = req.params;

            // 🔹 Validar parámetro obligatorio
            if (!company_id) {
                return res.status(400).json({
                    success: false,
                    status: 400,
                    message: "No se reconoce a la compañía",
                    sellers: []
                });
            }

            // 🔹 Buscar el rol de vendedor por nombre
            const sellerRole = await roles.findOne({
                where: { name: 'SELLER' }
            });

            if (!sellerRole) {
                return res.status(404).json({
                    success: false,
                    status: 404,
                    message: "Rol de vendedor no encontrado en el sistema",
                    sellers: []
                });
            }

            // 🔹 Obtener vendedores que están asignados como trabajadores a la compañía específica
            const sellersList = await users.findAll({
                where: { 
                    status: "active" 
                },
                attributes: ["id", "email", "first_name", "last_name", "phone", "status"],
                include: [
                    {
                        model: roles,
                        as: "role",
                        attributes: ["id", "name"]
                    },
                    {
                        model: user_companies,
                        as: 'company_assignments',
                        where: { 
                            company_id: company_id,
                            role_id: sellerRole.id,
                            status: 'active'
                        },
                        required: true, // INNER JOIN - solo usuarios con asignación activa
                        attributes: []  // No necesitamos datos de la asignación
                    }
                ]
            });

            // 🔹 Si no hay vendedores, devolver lista vacía (no es un error)
            if (!sellersList.length) {
                return res.status(200).json({
                    success: true,
                    status: 200,
                    message: "No hay vendedores asignados a esta compañía aún",
                    sellers: []
                    
                });
            }

            // 🔹 Formatear respuesta simplificada
            const formattedSellers = sellersList.map(seller => {
                // Procesar el teléfono para separar código de país y número
                let countryCode = undefined;
                let phoneNumber = undefined;

                if (seller.phone) {
                    if (seller.phone.includes('-')) {
                        [countryCode, phoneNumber] = seller.phone.split('-');
                    } else {
                        phoneNumber = seller.phone;
                    }
                }

                return {
                    id: seller.id,
                    email: seller.email,
                    name: seller.first_name,
                    lastName: seller.last_name,
                    countryCode: countryCode,
                    phone: phoneNumber,
                    status: seller.status,
                    role: {
                        id: seller.role.id,
                        name: seller.role.name
                    }
                };
            });

            console.log(`✅ Vendedores obtenidos para compañía ${company_id}:`, formattedSellers.length);

            res.status(200).json({
                success: true,
                status: 200,
                message: "Vendedores obtenidos exitosamente",
                sellers: formattedSellers
                
            });

        } catch (error) {
            console.error("❌ Error al obtener vendedores:", error);
            res.status(500).json({
                success: false,
                status: 500,
                message: "Error al obtener vendedores de la compañía",
                sellers: []
            });
        }
    },

    // 📌 Obtener un usuario por ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const user = await users.findByPk(id);

            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 📌 Crear un usuario
    async create(req, res) {
        try {
            console.log("➡️ POST /api/users - Datos recibidos:", req.body);

            if (!req.body || Object.keys(req.body).length === 0) {
                console.log("⚠️ El body está vacío");
                return res.status(400).json({ message: "El cuerpo de la solicitud no puede estar vacío" });
            }

            const { password, email, name, role_id, phone } = req.body;

            const roleExists = await roles.findByPk(role_id);
            if (!roleExists) {
                return res.status(400).json({ message: "El role_id proporcionado no existe" });
            }

            // Hashear la contraseña antes de guardar
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            const newUser = await users.create({
                password: hashedPassword,
                email,
                name,
                role_id,
                phone
            });

            console.log("✅ Usuario creado:", newUser);
            res.status(201).json(newUser);
        } catch (error) {
            console.error("❌ Error en createUser:", error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 📌 Actualizar un usuario por ID
    async update(req, res) {
        try {
            const { id } = req.params;
            const { password, email, name, role_id, phone } = req.body;

            const user = await users.findByPk(id);
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            // Si la contraseña es proporcionada, la hasheamos
            let updatedFields = { email, name, role_id, phone };
            if (password) {
                updatedFields.password = await bcrypt.hash(password, SALT_ROUNDS);
            }

            await user.update(updatedFields);
            res.status(200).json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // 📌 Eliminar un usuario por ID
    async delete(req, res) {
        try {
            const { id } = req.params;

            const user = await users.findByPk(id);
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            await user.destroy();
            res.status(200).json({ message: "Usuario eliminado correctamente" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

