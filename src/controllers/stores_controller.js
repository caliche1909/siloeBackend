const { stores, users, store_images } = require('../models');
const bcrypt = require('bcrypt');


const SALT_ROUNDS = 10;

module.exports = {

    // 📌 Método para crear una tienda con o sin usuario
    async createStore(req, res) {
      

        try {
            const { store, user } = req.body;

            // Validar que vengan los datos mínimos de la tienda
            const { name, address, store_type_id, neighborhood } = store || {};
            if (!name || !address || !store_type_id || !neighborhood) {
                return res.status(400).json({ error: "Faltan datos obligatorios de la tienda." });
            }

            // Procesar nombre y barrio
            store.name = store.name.trim().replace(/\s+/g, ' ').toUpperCase();
            store.neighborhood = store.neighborhood
                .trim()
                .replace(/\s+/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');

            // Validar duplicado si coincide nombre y barrio por que puede existir una tienda que se llame igual en otro barrio
            const existingStore = await stores.findOne({
                where: { name: store.name, neighborhood: store.neighborhood }
            });

            if (existingStore) {
                return res.status(400).json({ error: "Esta tienda ya existe." });
            }

            // ✅ Si llegaron datos del nuevo usuario, registrarlo
            if (user) {
                const existingUser = await users.findOne({ where: { email: user.email } });
                if (existingUser) {
                    return res.status(400).json({ error: "Email no valido" });
                }

                // Asignamos un rol por defecto (ajusta según tu lógica de roles)
                const defaultRoleId = 5; //Roll shopKeeper en la base de datos que es el tendero o administrador de la tienda
                const password = user.password || "PanificadoraSiloe.2025"; // Cambia esto: en la práctica deberías enviar un correo con enlace o autogenerar contraseña
                const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

                const newUser = await users.create({
                    name: user.name,
                    email: user.email,
                    phone: user.countryCode ? `${user.countryCode}-${user.phone}` : user.phone,
                    role_id: defaultRoleId,
                    password: hashedPassword, // ❗ Cambia esto: en la práctica deberías enviar un correo con enlace o autogenerar contraseña
                    status: user.status || "inactive"
                });

                // Asignamos su id como manager_id
                store.manager_id = newUser.id;
            }

            // Crear la tienda con el manager_id (si fue creado)
            const newStore = await stores.create(store);

            // Consultar la tienda con relaciones
            const createdStore = await stores.findOne({
                where: { id: newStore.id },
                attributes: [
                    'id', 'name', 'address', 'phone', 'neighborhood', 'route_id',
                    'image_url', 'latitude', 'longitude', 'opening_time', 'closing_time',
                    'city', 'state', 'country'
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['id', 'name', 'email', 'phone', 'status']
                    }
                ]
            });

            return res.status(201).json(createdStore);
        } catch (error) {
            console.error("❌ Error al crear tienda:", error);
            return res.status(500).json({ error: "Error al crear tienda." });
        }
    },

    // 📌 Método para actualizar una tienda por id
    async updateStore(req, res) {
        
        const { id } = req.params;

        try {
            // Verificar si la tienda existe
            const store = await stores.findByPk(id);
            if (!store) {
                return res.status(404).json({ error: "Tienda no encontrada." });
            }

            // Se espera que el body tenga dos propiedades: newStore y newUser
            const { newStore, newUser } = req.body;

            // Extraer todos los campos necesarios del body
            let {
                name,
                address,
                phone,
                neighborhood,
                route_id,
                image_url,
                latitude,
                longitude,
                opening_time,
                closing_time,
                city,
                state,
                country,
                store_type_id,
                manager_id
            } = newStore;

            // Validar que los campos obligatorios estén presentes
            if (!name || !address || !store_type_id || !neighborhood) {
                return res.status(400).json({ error: "Faltan datos obligatorios." });
            }

            // Transformar el nombre: eliminar espacios extra y convertir a mayúsculas
            let transformedName = name.trim().replace(/\s+/g, ' ').toUpperCase();

            // Actualizar los campos de la tienda (manteniendo los que no se envían)
            store.name = transformedName || store.name;
            store.address = address || store.address;
            store.phone = phone || store.phone;
            store.neighborhood = neighborhood;
            store.route_id = route_id !== undefined ? route_id : store.route_id;
            store.image_url = image_url || store.image_url;
            store.latitude = latitude || store.latitude;
            store.longitude = longitude || store.longitude;
            store.opening_time = opening_time || store.opening_time;
            store.closing_time = closing_time || store.closing_time;
            store.city = city || store.city;
            store.state = state || store.state;
            store.country = country || store.country;
            store.store_type_id = store_type_id || store.store_type_id;
            //store.manager_id = manager_id || store.manager_id;

            // Procesar el objeto newUser, si se envía
            if (newUser) {

                const defaultRoleId = 5;
                const password = "PanificadoraSiloe.2025";
                const defaultPassword = await bcrypt.hash(password, SALT_ROUNDS);

                if (store.manager_id) {
                    // Si la tienda ya tiene manager, buscarlo y actualizarlo
                    const existingManager = await users.findByPk(store.manager_id);
                    if (existingManager) {
                        existingManager.name = newUser.name;
                        existingManager.email = newUser.email;
                        existingManager.phone = newUser.countryCode ? `${newUser.countryCode}-${newUser.phone}` : newUser.phone;
                        existingManager.status = newUser.status || 'inactive';

                        await existingManager.save();
                    } else {
                        // En el caso poco frecuente que manager_id esté asignado pero no se encuentre el registro
                        const createdManager = await users.create({
                            name: newUser.name,
                            email: newUser.email,
                            phone: `${newUser.countryCode}-${newUser.phone}`,
                            status: newUser.status || 'inactive',
                            role_id: defaultRoleId,
                            password: defaultPassword,
                        });
                        store.manager_id = createdManager.id;
                    }
                } else {
                    // Si no existe manager para la tienda, se crea uno nuevo
                    const createdManager = await users.create({
                        name: newUser.name,
                        email: newUser.email,
                        phone: `${newUser.countryCode}-${newUser.phone}`,
                        status: newUser.status || 'inactive',
                        role_id: defaultRoleId,
                        password: defaultPassword,
                    });
                    store.manager_id = createdManager.id;
                }
            }
            // Si newUser no viene, se deja manager_id sin cambios

            // Guardar los cambios de la tienda en la base de datos
            const newStoreRecord = await store.save();

            // Obtener la tienda actualizada con sus relaciones completas (store_type y manager)
            const updatedStore = await stores.findOne({
                where: { id: newStoreRecord.id },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country'
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            console.log("✅ Tienda actualizada:", updatedStore);
            // Devuelve la tienda actualizada
            return res.status(200).json(updatedStore);
        } catch (error) {
            console.error("❌ Error al actualizar tienda:", error);
            return res.status(500).json({ error: "Error al actualizar tienda." });
        }
    },  

    // 📌 Método para obtener todas las tiendas que le pertenecen a una ruta
    async getStoresbyRoute(req, res) {
       
        const { route_id } = req.params;

        try {
            // Obtener todas las tiendas con sus relaciones completas (store_type y manager)
            const allStores = await stores.findAll({
                where: { route_id: route_id },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country',
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    },
                    {
                        association: 'images',
                        as: 'images',
                        attributes: ['id', 'image_url', 'public_id', 'is_primary'],
                    }
                ]
            });

            // Devolver todas las tiendas con sus relaciones
            return res.status(200).json(allStores);
        } catch (error) {
            console.error("❌ Error al obtener tiendas:", error);
            return res.status(500).json({ error: "Error al obtener tiendas." });
        }
    },

    // 📌 Método para obtener la lista de tiendas huerfanas
    async getOrphanStores(req, res) {
        console.log("📌 Intentando obtener todas las tiendas huérfanas...");

        try {
            // Obtener todas las tiendas huérfanas (sin ruta asociada)
            const orphanStores = await stores.findAll({
                where: { route_id: null },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',                    
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country'
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    },
                    {
                        association: 'images',
                        as: 'images',
                        attributes: ['id', 'image_url', 'public_id', 'is_primary'],
                    }
                ]
            });

            // Devolver la lista de tiendas huérfanas
            return res.status(200).json(orphanStores);
        } catch (error) {
            console.error("❌ Error al obtener tiendas huérfanas:", error);
            return res.status(500).json({ error: "Error al obtener tiendas huérfanas." });
        }
    },

    // 📌 Método para eliminar una tienda 
    async deleteStore(req, res) {
        console.log("📌 Intentando eliminar una tienda...");
        try {
            const { id } = req.params;

            // Verificar si la tienda existe
            const store = await stores.findByPk(id);
            if (!store) {
                return res.status(404).json({ error: "Tienda no encontrada." });
            }

            // Eliminar la tienda
            await stores.destroy({ where: { id } });

            return res.status(200).json({ message: "Tienda eliminada exitosamente." });
        } catch (error) {
            console.error("❌ Error al eliminar tienda:", error);
            return res.status(500).json({ error: "Error al eliminar tienda." });
        }
    },

    // 📌 Método para asignar una tienda a una ruta
    async assignStoreToRoute(req, res) {
        console.log("📌 Intentando asignar una tienda a una ruta...");
        const { storeId } = req.params;
        const { route_id } = req.body;

        try {
            // Verificar si la tienda existe
            const store = await stores.findByPk(storeId);
            if (!store) {
                return res.status(404).json({ error: "La tienda no existe" });
            }

            // Asignar la tienda a la ruta
            store.route_id = route_id;
            await store.save();

            const createdStore = await stores.findOne({
                where: { id: storeId },
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'neighborhood',
                    'route_id',
                    'image_url',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'city',
                    'state',
                    'country',
                ],
                include: [
                    {
                        association: 'store_type',
                        as: 'store_type',
                        attributes: ['id', 'name']
                    },
                    {
                        association: 'manager',
                        as: 'manager',
                        attributes: ['name', 'email', 'phone', 'status']
                    }
                ]
            });

            return res.status(200).json(createdStore);

        } catch (error) {
            console.error("❌ Error al asignar tienda a ruta:", error);
            return res.status(500).json({ error: "Error al asignar tienda a ruta." });
        }
    }

}