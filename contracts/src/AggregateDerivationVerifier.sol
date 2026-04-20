// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec
pragma solidity >=0.8.21;

import "./HonkBase.sol";

uint256 constant AGG_N = 64;
uint256 constant AGG_LOG_N = 6;
uint256 constant AGG_NUMBER_OF_PUBLIC_INPUTS = 9;
uint256 constant AGG_VK_HASH = 0x244776cad4e50ed2749502fc0a34457308589ee8a93f9c9f3fb3e5685881e97c;

library AggregateHonkVK {
    function loadVerificationKey() internal pure returns (Honk.VerificationKey memory) {
        Honk.VerificationKey memory vk = Honk.VerificationKey({
            circuitSize: uint256(64),
            logCircuitSize: uint256(6),
            publicInputsSize: uint256(9),
            ql: Honk.G1Point({ 
               x: uint256(0x2bcde6ee8cfe74bcc12d9ca384ff0512b452b9ef09551003cb87920608e5eef8),
               y: uint256(0x066f232b36f886a56d9da8b5dc457aca35eda0dca5dd7844b74b92c5f10a38d7)
            }),
            qr: Honk.G1Point({ 
               x: uint256(0x2cf7cc4186f11134f8d12328b658afcdc21ea9a5997e68cdecc962af9dc193ef),
               y: uint256(0x2efe82547c110ccdfc1a17ce5ed1d47d1cd79681470b914ebd2b7d0ac3417ccc)
            }),
            qo: Honk.G1Point({ 
               x: uint256(0x25ce7990ff0a430cc9b185ce244ae16e6ee955ae945afb8085444117cf935760),
               y: uint256(0x082f01e5e1b614045b3d9f0713f4803b22b8062b916abf6fe53aa3e1b06238f7)
            }),
            q4: Honk.G1Point({ 
               x: uint256(0x1da320cb90eec7172a3692419222e6fb86fc419d3daad2fbfb3b80286ada98b2),
               y: uint256(0x205d3efae70432a115201e3866254e2859e245e2001e4f616c93087342a6b16d)
            }),
            qm: Honk.G1Point({ 
               x: uint256(0x0298337466f29c68a89f6d0a4f693758685a098fd459dc389eedd838d3b749a0),
               y: uint256(0x2fac28066aaa10683e7c3c053c5ecab37440c379e84d27a5c2a25fb07c49a071)
            }),
            qc: Honk.G1Point({ 
               x: uint256(0x2b98aa1c7c54c4758ecb0fd283454ac7da9cf4c2d6f2578b44721c606b309d01),
               y: uint256(0x00f9269655433ae53f8e3bff33a8b9b0a4901621dfb5790d9984cbc939dbf16f)
            }),
            qLookup: Honk.G1Point({ 
               x: uint256(0x22011c91613251ef53fd12a397e4bd6165b1ed309dcd94b33ac4226d34b68889),
               y: uint256(0x1fb02875a3542a3a6f4426ad912b70cf32b444a8e439701da6e8e7b30029cfc7)
            }),
            qArith: Honk.G1Point({ 
               x: uint256(0x0af7cb8011f8995a5a524a6c7b5a612bfe6cf4ec1f26e92d06248cb648ac7d30),
               y: uint256(0x2ee8ab2020b8051646591a318515a2817e94a9ab493760d5ee5ee1027238a468)
            }),
            qDeltaRange: Honk.G1Point({ 
               x: uint256(0x236e982930a9984fd08a3edddf25a1677bd789aa094b735f2abf3d9cfd032188),
               y: uint256(0x2ddf6475059b2e9451db5b8d857bffc07a966aebd836d8a800f54b1c3bb5c36f)
            }),
            qElliptic: Honk.G1Point({ 
               x: uint256(0x140b0936c323fd2471155617b6af56ee40d90bea71fba7a412dd61fcf34e8ceb),
               y: uint256(0x2b6c10790a5f6631c87d652e059df42b90071823185c5ff8e440fd3d73b6fefc)
            }),
            qMemory: Honk.G1Point({ 
               x: uint256(0x1f497cbf5284ff29a2d336e599199929a17181c7934fc3fdbd352eac5cb521b9),
               y: uint256(0x13ea38a0bd2aa751a490a724fac818072bd9c0c6beda1fdee6d4ff0432ba9e1b)
            }),
            qNnf: Honk.G1Point({ 
               x: uint256(0x0384638dd92e0abd1d0455ad4b429bee5960e2f4e0eef28e946561e55a4d9807),
               y: uint256(0x0edd0d417777cdfe14def171f26ffd8849f800a9aa2563c403966bb405f3a5d3)
            }),
            qPoseidon2External: Honk.G1Point({ 
               x: uint256(0x26131fc1251eb7746e72a19f9f9b250f079744ec926fc2a41fb8a0489d1fb444),
               y: uint256(0x03588be01690f20304e3d200c3b81a867f03abc37431898437d94c0822213fbb)
            }),
            qPoseidon2Internal: Honk.G1Point({ 
               x: uint256(0x1f1421ea18de80f53cc757c2800b4f14cc36f604fbdebfef8491bcbbe8bfaefd),
               y: uint256(0x26ee0b70abaffc3019998c94f5cd68b857874327a9291d5afaa8364a8327ad75)
            }),
            s1: Honk.G1Point({ 
               x: uint256(0x0630ca4ccd02f547755451da989b281e11f1c3a0397328c057c210bae4362ba0),
               y: uint256(0x1cf85f7176723c18f952597a8c267a6c179d63644917fb6a24c1833c261e98ad)
            }),
            s2: Honk.G1Point({ 
               x: uint256(0x2d5fff1f8bae10bf9ff0c061b2cd3f2c8723412880909721a62f83b050fd5cd6),
               y: uint256(0x1640c06de7e3b5e35ed1e43b5aab64d72234ea1266049244c75c3faa7822a5c4)
            }),
            s3: Honk.G1Point({ 
               x: uint256(0x0ad600e558bb735fe1a9221a31b1e753e50baeaf2c4219489c69753cbbcfe720),
               y: uint256(0x01aac46762b2ea59f18f4efe5f239a825582131f9f70808c59c73f6152416753)
            }),
            s4: Honk.G1Point({ 
               x: uint256(0x2ac07486e5222250318a6796cd9e0205ebcba45d028f589eda1dd691d199fb1a),
               y: uint256(0x255e41bec7cbfbacf8c1823d3911231a1fac6831746d43ef58cb8ee8616b1388)
            }),
            t1: Honk.G1Point({ 
               x: uint256(0x099e3bd5a0a00ab7fe18040105b9b395b5d8b7b4a63b05df652b0d10ef146d26),
               y: uint256(0x0015b8d2515d76e2ccec99dcd194592129af3a637f5a622a32440f860d1e2a7f)
            }),
            t2: Honk.G1Point({ 
               x: uint256(0x1b917517920bad3d8bc01c9595092a222b888108dc25d1aa450e0b4bc212c37e),
               y: uint256(0x305e8992b148eedb22e6e992077a84482141c7ebe42000a1d58ccb74381f6d19)
            }),
            t3: Honk.G1Point({ 
               x: uint256(0x16465a5ccbb550cd2c63bd58116fe47c86847618681dc29d8a9363ab7c40e1c3),
               y: uint256(0x2e24d420fbf9508ed31de692db477b439973ac12d7ca796d6fe98ca40e6ca6b7)
            }),
            t4: Honk.G1Point({ 
               x: uint256(0x043d063b130adfb37342af45d0155a28edd1a7e46c840d9c943fdf45521c64ce),
               y: uint256(0x261522c4089330646aff96736194949330952ae74c573d1686d9cb4a00733854)
            }),
            id1: Honk.G1Point({ 
               x: uint256(0x15fcb416586a05499487af5292bb0a14d8dc97fbf5d4c18fc14392fd2ea5ee4b),
               y: uint256(0x0e6834303c995d3483d6ea994376224888c6f8dd646195aecceb2e6862912db5)
            }),
            id2: Honk.G1Point({ 
               x: uint256(0x2117895a289e09701b3dd1f078cfe81ca04bf8c8049699718f1c0725043519c3),
               y: uint256(0x1116997fa6f0665cbc19facfe408ceae2e8958361fd914c72f15dbd9183bc585)
            }),
            id3: Honk.G1Point({ 
               x: uint256(0x1d7d2edce421cc8a0caba554279981dc51d5ee41720a14f3e5ec601b33f5fcee),
               y: uint256(0x0d0a28aee1303b9ac207801628bb2a379cdb1e69c4daee616db36488f4662a40)
            }),
            id4: Honk.G1Point({ 
               x: uint256(0x22497fcc59018cce54e67d16a08cf54260119136a390572e891823fbed67f64d),
               y: uint256(0x214e4b92cfed67881333edf317aa3769680e9b982b1ee3ec4a20d81df435423f)
            }),
            lagrangeFirst: Honk.G1Point({ 
               x: uint256(0x0000000000000000000000000000000000000000000000000000000000000001),
               y: uint256(0x0000000000000000000000000000000000000000000000000000000000000002)
            }),
            lagrangeLast: Honk.G1Point({ 
               x: uint256(0x290f2ceb7f9583d8ae4e91b9285e74a7747011843097bfec3cc4350d7076bbe6),
               y: uint256(0x2a5c3e4b56b8fb209eba525fca6f00baf8f4374d9a184b3d03996305d37d8a9b)
            })
        });
        return vk;
    }
}

contract AggregateDerivationVerifier is BaseZKHonkVerifier(AGG_N, AGG_LOG_N, AGG_VK_HASH, AGG_NUMBER_OF_PUBLIC_INPUTS) {
    function loadVerificationKey() internal pure override returns (Honk.VerificationKey memory) {
        return AggregateHonkVK.loadVerificationKey();
    }
}
